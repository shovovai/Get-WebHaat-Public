import "server-only";
import { getStripeClient } from "@/lib/stripe";
import { backendClient } from "@/sanity/lib/backendClient";
import { brand } from "@/config/brand";
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES } from "@/lib/orderStatus";
import { markOrderPaid } from "@/lib/orderPayment";
import { OutOfStockError, ensureStockForPaidOrder, reserveOrderStock } from "@/lib/stock";
import { RESERVATION_MINUTES, reservationDeadline, type GatewayMethod } from "@/lib/orderGuards";
import { writeAuditLog } from "@/lib/auditLog";
import { getAdminEmails } from "@/lib/adminUtils";
import { sendMail } from "@/lib/emailService";
import { escapeHtml } from "@/lib/html";

const ZERO_DECIMAL = new Set([
  "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA",
  "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);

export class CheckoutError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export interface PayableOrder {
  _id: string;
  orderNumber: string;
  email?: string;
  clerkUserId?: string;
  status?: string;
  paymentStatus?: string;
  totalPrice?: number;
  currency?: string;
  customerName?: string;
  address?: { name?: string; address?: string; city?: string; state?: string; zip?: string };
  phone?: string;
  paymentMethod?: string;
}

/** Loads an order that belongs to the given user and can still be paid */
export async function loadPayableOrder(orderId: string, clerkUserId: string): Promise<PayableOrder> {
  const order = await backendClient.fetch<PayableOrder | null>(
    `*[_type == "order" && _id == $orderId && clerkUserId == $clerkUserId][0]{
      _id, orderNumber, email, clerkUserId, status, paymentStatus,
      totalPrice, currency, customerName, address, phone, paymentMethod
    }`,
    { orderId, clerkUserId }
  );
  if (!order) throw new CheckoutError("Order not found", 404);
  if (order.paymentStatus === PAYMENT_STATUSES.PAID || order.status === ORDER_STATUSES.PAID) {
    throw new CheckoutError("This order is already paid");
  }
  if (order.status === ORDER_STATUSES.CANCELLED) {
    throw new CheckoutError("This order was cancelled");
  }
  if (order.paymentStatus === PAYMENT_STATUSES.AWAITING_VERIFICATION) {
    throw new CheckoutError("Your payment for this order is already being verified");
  }
  if (!order.totalPrice || order.totalPrice <= 0) {
    throw new CheckoutError("Invalid order total");
  }
  return order;
}

/**
 * Called right before a gateway session is created for an order:
 *  - records the gateway as the order's paymentMethod, so the gateway's completion
 *    lookup (which filters by paymentMethod) finds the order. Cash-on-delivery orders
 *    keep "cash_on_delivery" until the online payment actually succeeds (an abandoned
 *    online attempt must not stop the courier from collecting cash);
 *  - (re)takes the order's stock for RESERVATION_MINUTES if its hold had expired or
 *    was released after a failed payment. Throws CheckoutError when stock ran out.
 */
export async function prepareOrderForGateway(order: PayableOrder, method: GatewayMethod) {
  if (order.paymentMethod === PAYMENT_METHODS.CASH_ON_DELIVERY) return;
  try {
    await reserveOrderStock(order._id, { reservedUntil: reservationDeadline() });
  } catch (error) {
    if (error instanceof OutOfStockError) {
      throw new CheckoutError(`${error.message}. This order can no longer be paid — please place a new order.`, 409);
    }
    throw error;
  }
  if (order.paymentMethod !== method) {
    await backendClient.patch(order._id).set({ paymentMethod: method }).commit();
    order.paymentMethod = method;
  }
}

async function emailAdmins(subject: string, text: string) {
  await Promise.all(
    getAdminEmails().map((email) =>
      sendMail({
        email,
        subject,
        text,
        html: `<div style="font-family:Arial,sans-serif"><h3>${escapeHtml(subject)}</h3><p>${escapeHtml(text)}</p><p><a href="${brand.url}/admin/orders">Open orders</a></p></div>`,
      }).catch(() => {})
    )
  );
}

/**
 * Single place where a confirmed gateway payment (Stripe, bKash, Nagad, SSLCommerz)
 * is applied to an order.
 *  - Normal case: marks the order paid, records the gateway as paymentMethod and makes
 *    sure the order still holds its stock (flags `stockShortage` if it ran out).
 *  - Order was cancelled before the money arrived: the order is NOT revived. It is
 *    marked paid + `refundRequired` and admins are emailed so they refund it.
 * Returns paid=false with refundPending=true in the second case.
 */
export async function settleGatewayPayment(
  orderId: string,
  method: GatewayMethod,
  opts: { transactionId?: string; gatewayPaymentId?: string; set?: Record<string, unknown> } = {}
): Promise<{ paid: boolean; refundPending?: boolean }> {
  const order = await backendClient.fetch<{
    _id: string;
    _rev: string;
    orderNumber?: string;
    status?: string;
    paymentStatus?: string;
    paymentMethod?: string;
    totalPrice?: number;
    refundRequired?: boolean;
  } | null>(
    `*[_type == "order" && _id == $orderId][0]{ _id, _rev, orderNumber, status, paymentStatus, paymentMethod, totalPrice, refundRequired }`,
    { orderId }
  );
  if (!order) return { paid: false };
  if (order.paymentStatus === PAYMENT_STATUSES.PAID) {
    return order.refundRequired ? { paid: false, refundPending: true } : { paid: true };
  }

  if (order.status === ORDER_STATUSES.CANCELLED) {
    const now = new Date().toISOString();
    await backendClient
      .patch(order._id)
      .ifRevisionId(order._rev)
      .set({
        paymentStatus: PAYMENT_STATUSES.PAID,
        paidAt: now,
        refundRequired: true,
        paymentMethod: method,
        ...(opts.transactionId && { paymentTransactionId: opts.transactionId }),
        ...(opts.gatewayPaymentId && { gatewayPaymentId: opts.gatewayPaymentId }),
        ...(opts.set || {}),
      })
      .commit();
    await writeAuditLog({
      actorClerkId: "system",
      actorRole: "system",
      action: "order.payment.after_cancel",
      targetId: order._id,
      targetType: "order",
      before: { status: order.status, paymentStatus: order.paymentStatus },
      after: { status: order.status, paymentStatus: PAYMENT_STATUSES.PAID, refundRequired: true },
      note: `${method} payment ${opts.transactionId || opts.gatewayPaymentId || ""} arrived after cancellation`,
    });
    await emailAdmins(
      `Refund needed: payment received for cancelled order ${order.orderNumber}`,
      `A ${method} payment of ${order.totalPrice} (ref ${opts.transactionId || opts.gatewayPaymentId || "n/a"}) arrived for order ${order.orderNumber} after it was cancelled. The order was not reopened. Please refund the customer.`
    );
    return { paid: false, refundPending: true };
  }

  await markOrderPaid(order._id, {
    transactionId: opts.transactionId,
    gatewayPaymentId: opts.gatewayPaymentId,
    set: { ...(opts.set || {}), paymentMethod: method },
  });
  const { shortage } = await ensureStockForPaidOrder(order._id);
  if (shortage) {
    await emailAdmins(
      `Stock shortage on paid order ${order.orderNumber}`,
      `Order ${order.orderNumber} was paid after its stock hold expired and one or more items are now out of stock. Please restock, or contact the customer and refund.`
    );
  }
  return { paid: true };
}

/**
 * Creates a Stripe Checkout session for exactly the order total stored in Sanity
 * (discounts, shipping and tax included). Returns the hosted payment URL.
 */
export async function createStripeSessionForOrder(order: PayableOrder): Promise<string> {
  const stripe = await getStripeClient();
  const currency = (order.currency || "USD").toUpperCase();
  const unitAmount = ZERO_DECIMAL.has(currency)
    ? Math.round(order.totalPrice!)
    : Math.round(order.totalPrice! * 100);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: unitAmount,
          product_data: {
            name: `${brand.name} order ${order.orderNumber}`,
            description: "Items, shipping and tax",
          },
        },
      },
    ],
    customer_email: order.email || undefined,
    customer_creation: "always",
    invoice_creation: { enabled: true },
    success_url: `${brand.url}/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order._id}&orderNumber=${encodeURIComponent(order.orderNumber)}`,
    cancel_url: `${brand.url}/user/orders/${order._id}?cancelled=true`,
    // Stripe's minimum session lifetime is 30 minutes; keep it close to the stock hold
    expires_at: Math.floor(Date.now() / 1000) + Math.min(Math.max(RESERVATION_MINUTES, 30) + 1, 24 * 60) * 60,
    metadata: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      expectedAmount: String(unitAmount),
    },
  });

  await backendClient
    .patch(order._id)
    .set({ stripeCheckoutSessionId: session.id })
    .commit()
    .catch(() => {});

  if (!session.url) throw new CheckoutError("Stripe did not return a payment URL", 502);
  return session.url;
}
