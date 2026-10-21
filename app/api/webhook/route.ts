import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeClient, getStripeWebhookSecret } from "@/lib/stripe";

// Assigned at the start of each request (keys come from Admin → Payments)
let stripe: Stripe;
import { backendClient } from "@/sanity/lib/backendClient";
import { settleGatewayPayment } from "@/lib/stripeCheckout";
import { releaseUnpaidOrderStock } from "@/lib/stock";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature");

  if (!sig) {
    return NextResponse.json(
      {
        error: "No signature",
      },
      { status: 400 }
    );
  }

  const webhookSecret = await getStripeWebhookSecret();
  if (!webhookSecret) {
    return NextResponse.json(
      {
        error: "Stripe webhook secret is not set",
      },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    stripe = await getStripeClient({ requireEnabled: false });
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json(
      {
        error: "Webhook signature verification failed",
      },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // Only mark orders paid when Stripe confirms the money was collected and
    // the charged amount matches what we asked for.
    const expected = session.metadata?.expectedAmount;
    if (
      session.payment_status !== "paid" ||
      (expected && String(session.amount_total) !== expected)
    ) {
      console.error("Stripe session not paid or amount mismatch", session.id);
      return NextResponse.json({ received: true });
    }

    try {
      // Get orderId from session metadata
      const orderId = session.metadata?.orderId;

      if (orderId) {
        // Generate invoice if not already exists
        let invoice: Stripe.Invoice | null = null;

        if (session.invoice) {
          invoice = await stripe.invoices.retrieve(session.invoice as string);
        } else if (session.customer && session.payment_intent) {
          // Get order details for invoice creation
          const order = await backendClient.fetch(
            `*[_type == "order" && _id == $orderId][0]{
              _id,
              orderNumber,
              products[]{ product->{_id, name, price, currency}, quantity },
              subtotal,
              tax,
              shipping,
              totalPrice,
              currency
            }`,
            { orderId }
          );

          if (order) {
            // Create and finalize invoice
            invoice = await createAndFinalizeInvoice(
              orderId,
              session.customer as string,
              order.products || [],
              {
                totalAmount: order.totalAmount || 0,
                customerEmail: order.email || "",
                orderNumber: order.orderNumber,
                currency: order.currency,
                tax: order.tax || 0,
                shipping: order.shipping || 0,
              }
            );
          }
        }

        await updateOrderWithPaymentCompletion(orderId, session, invoice);
      } else {
        console.error("No orderId found in session metadata");
        return NextResponse.json(
          {
            error: "No orderId found in session metadata",
          },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error("Error processing order:", error);
      return NextResponse.json({ error: "Error processing order" }, { status: 400 });
    }
  }

  if (event.type === "checkout.session.expired") {
    try {
      await releaseExpiredSession(event.data.object as Stripe.Checkout.Session);
    } catch (error) {
      console.error("Error releasing stock for expired session:", error);
    }
  }

  return NextResponse.json({ received: true });
}

// Helper function to create and finalize an invoice
async function createAndFinalizeInvoice(
  orderId: string,
  stripeCustomerId: string,
  products: {
    product: { _id?: string; name: string; price?: number };
    quantity: number;
  }[],
  orderData: {
    totalAmount: number;
    customerEmail: string;
    orderNumber?: string;
    currency?: string;
    tax?: number;
    shipping?: number;
  }
) {
  try {
    // Validate required data
    if (!stripeCustomerId) {
      console.error(`Missing stripeCustomerId for order: ${orderId}`);
      return null;
    }

    if (!products || products.length === 0) {
      console.error(`No products found for order: ${orderId}`);
      return null;
    }

    // Validate currency
    const currency = (orderData.currency || "USD").toLowerCase();
    if (!["usd", "eur", "gbp", "cad", "aud"].includes(currency)) {
      console.warn(`Unsupported currency: ${currency}, defaulting to USD`);
    }

    // Create the invoice
    const invoice = await stripe.invoices.create({
      customer: stripeCustomerId,
      description: `Invoice for Order ${orderData.orderNumber || orderId}`,
      metadata: {
        orderId: orderId,
        orderNumber: orderData.orderNumber || "",
        source: "webhook",
      },
      auto_advance: false,
      collection_method: "charge_automatically",
    });

    // Add invoice items for products
    for (const item of products) {
      if (!item.product || !item.product.name || !item.product.price) {
        console.warn(`Skipping invalid product in order ${orderId}:`, item);
        continue;
      }

      try {
        await stripe.invoiceItems.create({
          customer: stripeCustomerId,
          invoice: invoice.id,
          amount: Math.round(item.product.price * item.quantity * 100),
          currency: currency,
          description: `${item.product.name} x ${item.quantity}`,
          metadata: {
            productId: item.product._id || "",
            quantity: item.quantity.toString(),
          },
        });
      } catch (error) {
        console.error(`Failed to add invoice item:`, error);
        throw error;
      }
    }

    // Add tax if any
    if (orderData.tax && orderData.tax > 0) {
      try {
        await stripe.invoiceItems.create({
          customer: stripeCustomerId,
          invoice: invoice.id,
          amount: Math.round(orderData.tax * 100),
          currency: currency,
          description: "Tax",
          metadata: { type: "tax" },
        });
      } catch (error) {
        console.error(`Failed to add tax:`, error);
        throw error;
      }
    }

    // Add shipping if any
    if (orderData.shipping && orderData.shipping > 0) {
      try {
        await stripe.invoiceItems.create({
          customer: stripeCustomerId,
          invoice: invoice.id,
          amount: Math.round(orderData.shipping * 100),
          currency: currency,
          description: "Shipping",
          metadata: { type: "shipping" },
        });
      } catch (error) {
        console.error(`Failed to add shipping:`, error);
        throw error;
      }
    }

    // Finalize the invoice
    if (!invoice.id) {
      throw new Error("Failed to create invoice - no invoice ID");
    }

    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

    return finalizedInvoice;
  } catch (error) {
    console.error(`Error creating invoice for order ${orderId}:`, error);
    return null;
  }
}

async function updateOrderWithPaymentCompletion(
  orderId: string,
  session: Stripe.Checkout.Session,
  invoice: Stripe.Invoice | null
) {
  const { id, customer, payment_intent } = session;

  // Only payment fields change; the fulfillment status is left alone (a COD order
  // paid online keeps its delivery status, a new order stays "pending").
  // A payment for an order that was cancelled meanwhile does NOT revive it: the
  // order is flagged refundRequired and admins are emailed (settleGatewayPayment).
  const result = await settleGatewayPayment(orderId, "stripe", {
    transactionId: (payment_intent as string) || undefined,
    set: {
      stripeCheckoutSessionId: id,
      stripePaymentIntentId: payment_intent as string,
      stripeCustomerId: customer as string, // Store the correct Stripe customer ID
      paymentCompletedAt: new Date().toISOString(),
      ...(invoice && {
        invoice: {
          id: invoice.id,
          number: invoice.number,
          hosted_invoice_url: invoice.hosted_invoice_url,
        },
      }),
    },
  });
  if (result.refundPending) {
    console.warn(`Stripe payment ${payment_intent} received for cancelled order ${orderId}; refund required`);
  }
}

/** A Checkout session expired unpaid: release the stock hold if it was the order's latest attempt */
async function releaseExpiredSession(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId;
  if (!orderId) return;
  const latest = await backendClient.fetch<string | null>(
    `*[_type == "order" && _id == $orderId][0].stripeCheckoutSessionId`,
    { orderId }
  );
  if (latest === session.id) await releaseUnpaidOrderStock(orderId);
}
