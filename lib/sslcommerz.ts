import "server-only";
import crypto from "crypto";
import { backendClient } from "@/sanity/lib/backendClient";
import { brand } from "@/config/brand";
import { PAYMENT_STATUSES } from "@/lib/orderStatus";
import { CheckoutError, settleGatewayPayment, type PayableOrder } from "@/lib/stripeCheckout";
import { getPaymentConfig } from "@/lib/paymentConfig";
import { releaseUnpaidOrderStock } from "@/lib/stock";

// SSLCommerz hosted checkout (bKash, Nagad, Rocket, Upay, cards, net banking).
// Docs: https://developer.sslcommerz.com/doc/v4/

// Credentials come from Admin → Payments (falls back to .env)
async function credentials() {
  const { sslcommerz } = await getPaymentConfig();
  if (!sslcommerz.enabled || !sslcommerz.storeId || !sslcommerz.storePassword) {
    throw new CheckoutError("SSLCommerz is not configured", 503);
  }
  return {
    storeId: sslcommerz.storeId,
    storePass: sslcommerz.storePassword,
    base: sslcommerz.sandbox ? "https://sandbox.sslcommerz.com" : "https://securepay.sslcommerz.com",
  };
}

/** Starts a hosted payment session and returns the gateway URL */
export async function createSslCommerzSession(order: PayableOrder): Promise<string> {
  const { storeId, storePass, base } = await credentials();
  const tranId = `${order.orderNumber}-${crypto.randomBytes(3).toString("hex")}`;
  const callback = `${brand.url}/api/payments/sslcommerz`;

  const form = new URLSearchParams({
    store_id: storeId,
    store_passwd: storePass,
    total_amount: order.totalPrice!.toFixed(2),
    currency: (order.currency || "BDT").toUpperCase(),
    tran_id: tranId,
    success_url: `${callback}/success`,
    fail_url: `${callback}/fail`,
    cancel_url: `${callback}/cancel`,
    ipn_url: `${callback}/ipn`,
    shipping_method: "NO",
    product_name: `${brand.name} order ${order.orderNumber}`,
    product_category: "General",
    product_profile: "general",
    num_of_item: "1",
    cus_name: order.customerName || order.address?.name || "Customer",
    cus_email: order.email || "customer@example.com",
    cus_add1: order.address?.address || "N/A",
    cus_city: order.address?.city || "N/A",
    cus_state: order.address?.state || "",
    cus_postcode: order.address?.zip || "0000",
    cus_country: "Bangladesh",
    cus_phone: order.phone || "01700000000",
    value_a: order._id,
  });

  const res = await fetch(`${base}/gwprocess/v4/api.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  const data = await res.json().catch(() => null);
  if (!data || data.status !== "SUCCESS" || !data.GatewayPageURL) {
    console.error("SSLCommerz init failed:", data);
    throw new CheckoutError("Could not start the payment. Please try again.", 502);
  }

  await backendClient.patch(order._id).set({ paymentTransactionId: tranId }).commit();
  return data.GatewayPageURL as string;
}

interface ValidationResult {
  status?: string;
  tran_id?: string;
  val_id?: string;
  amount?: string;
  currency_type?: string;
  value_a?: string;
}

/**
 * Validates a payment with SSLCommerz's server-side validation API and, when
 * everything matches the order, marks it paid. Returns the order id if paid.
 */
export async function confirmSslCommerzPayment(
  valId: string
): Promise<{ orderId?: string; paid: boolean; refundPending?: boolean }> {
  const { storeId, storePass, base } = await credentials();
  const url = `${base}/validator/api/validationserverAPI.php?val_id=${encodeURIComponent(
    valId
  )}&store_id=${encodeURIComponent(storeId)}&store_passwd=${encodeURIComponent(storePass)}&format=json`;

  const res = await fetch(url, { cache: "no-store" });
  const v = (await res.json().catch(() => null)) as ValidationResult | null;
  const orderId = v?.value_a;
  if (!v || !orderId || !["VALID", "VALIDATED"].includes(v.status || "")) {
    return { orderId, paid: false };
  }

  const order = await backendClient.fetch<{
    _id: string;
    orderNumber: string;
    clerkUserId?: string;
    totalPrice?: number;
    currency?: string;
    paymentStatus?: string;
    paymentTransactionId?: string;
  } | null>(
    `*[_type == "order" && _id == $orderId][0]{ _id, orderNumber, clerkUserId, totalPrice, currency, paymentStatus, paymentTransactionId }`,
    { orderId }
  );
  if (!order) return { orderId, paid: false };
  if (order.paymentStatus === PAYMENT_STATUSES.PAID) return { orderId, paid: true };

  const amountOk = Math.abs(Number(v.amount) - (order.totalPrice || 0)) < 0.01;
  const currencyOk = (v.currency_type || "").toUpperCase() === (order.currency || "").toUpperCase();
  const tranOk = Boolean(v.tran_id) && order.paymentTransactionId === v.tran_id;
  if (!amountOk || !currencyOk || !tranOk) {
    console.error("SSLCommerz validation mismatch", { orderId, v });
    return { orderId, paid: false };
  }

  const settled = await settleGatewayPayment(order._id, "sslcommerz", {
    transactionId: `${v.tran_id} / ${v.val_id}`,
  });
  return { orderId, ...settled };
}

/**
 * The customer was sent back to the fail / cancel URL. The posted form is not signed,
 * so stock is only released when the posted tran_id matches the order's latest attempt
 * (a random value only SSLCommerz and the customer know).
 */
export async function failSslCommerzPayment(orderId: string, tranId: string) {
  if (!orderId || !tranId) return;
  const order = await backendClient.fetch<{ _id: string; paymentTransactionId?: string } | null>(
    `*[_type == "order" && _id == $orderId][0]{ _id, paymentTransactionId }`,
    { orderId }
  );
  if (order && order.paymentTransactionId === tranId) {
    await releaseUnpaidOrderStock(order._id);
  }
}
