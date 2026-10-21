import "server-only";
import { backendClient } from "@/sanity/lib/backendClient";
import { brand } from "@/config/brand";
import { getPaymentConfig } from "@/lib/paymentConfig";
import { CheckoutError, settleGatewayPayment, type PayableOrder } from "@/lib/stripeCheckout";
import { releaseUnpaidOrderStock } from "@/lib/stock";

// bKash Tokenized Checkout (merchant API).
// Docs: https://developer.bka.sh/docs/tokenized-checkout-process-overview

type BkashCfg = Awaited<ReturnType<typeof getPaymentConfig>>["bkash"];

const baseUrl = (sandbox: boolean) =>
  sandbox
    ? "https://tokenized.sandbox.bka.sh/v1.2.0-beta"
    : "https://tokenized.pay.bka.sh/v1.2.0-beta";

let tokenCache: { key: string; token: string; expiresAt: number } | null = null;

async function config(): Promise<BkashCfg> {
  const { bkash } = await getPaymentConfig();
  if (!bkash.enabled || !bkash.appKey || !bkash.appSecret || !bkash.username || !bkash.password) {
    throw new CheckoutError("bKash is not configured", 503);
  }
  return bkash;
}

async function grantToken(cfg: BkashCfg): Promise<string> {
  const cacheKey = `${cfg.sandbox}:${cfg.appKey}:${cfg.username}`;
  if (tokenCache && tokenCache.key === cacheKey && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.token;
  }
  const res = await fetch(`${baseUrl(cfg.sandbox)}/tokenized/checkout/token/grant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      username: cfg.username,
      password: cfg.password,
    },
    body: JSON.stringify({ app_key: cfg.appKey, app_secret: cfg.appSecret }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  if (!data?.id_token) {
    console.error("bKash token grant failed:", data);
    throw new CheckoutError("Could not connect to bKash. Please try again.", 502);
  }
  tokenCache = {
    key: cacheKey,
    token: data.id_token,
    expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
  };
  return data.id_token;
}

async function call<T = Record<string, string>>(cfg: BkashCfg, path: string, body: unknown): Promise<T> {
  const token = await grantToken(cfg);
  const res = await fetch(`${baseUrl(cfg.sandbox)}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: token,
      "X-App-Key": cfg.appKey,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return (await res.json().catch(() => ({}))) as T;
}

/** Creates a bKash payment for the stored order total and returns the bKash page URL */
export async function createBkashPayment(order: PayableOrder): Promise<string> {
  if ((order.currency || "").toUpperCase() !== "BDT") {
    throw new CheckoutError("bKash payments require the store currency to be BDT", 400);
  }
  const cfg = await config();
  const data = await call(cfg, "/tokenized/checkout/create", {
    mode: "0011",
    payerReference: (order.phone || order.orderNumber).slice(0, 20),
    callbackURL: `${brand.url}/api/payments/bkash/callback`,
    amount: order.totalPrice!.toFixed(2),
    currency: "BDT",
    intent: "sale",
    merchantInvoiceNumber: order.orderNumber,
  });
  if (data.statusCode !== "0000" || !data.paymentID || !data.bkashURL) {
    console.error("bKash create failed:", data);
    throw new CheckoutError("Could not start bKash payment. Please try again.", 502);
  }
  await backendClient.patch(order._id).set({ gatewayPaymentId: data.paymentID }).commit();
  return data.bkashURL;
}

/**
 * Handles the customer returning from bKash. Executes the payment, checks it
 * against the order (invoice number + amount) and marks the order paid.
 */
export async function completeBkashPayment(
  paymentID: string,
  status: string
): Promise<{ orderId?: string; paid: boolean; refundPending?: boolean }> {
  const order = await backendClient.fetch<{
    _id: string;
    orderNumber: string;
    totalPrice: number;
    paymentStatus?: string;
  } | null>(
    // Cash-on-delivery orders keep their method until an online payment succeeds
    `*[_type == "order" && paymentMethod in ["bkash", "cash_on_delivery"] && gatewayPaymentId == $paymentID][0]{ _id, orderNumber, totalPrice, paymentStatus }`,
    { paymentID }
  );
  if (!order) return { orderId: undefined, paid: false };
  if (order.paymentStatus === "paid") return { orderId: order._id, paid: true };
  if (status !== "success") {
    // Customer cancelled or the payment failed: put the stock back on sale.
    // It is taken again if they retry the payment.
    await releaseUnpaidOrderStock(order._id);
    return { orderId: order._id, paid: false };
  }

  const cfg = await config();
  let result = await call(cfg, "/tokenized/checkout/execute", { paymentID });
  if (result.statusCode !== "0000") {
    // Already executed / network retry → ask bKash for the final status
    result = await call(cfg, "/tokenized/checkout/payment/status", { paymentID });
  }

  const completed =
    result.transactionStatus === "Completed" &&
    result.merchantInvoiceNumber === order.orderNumber &&
    Math.abs(Number(result.amount) - order.totalPrice) < 0.01;

  if (!completed) {
    console.error("bKash payment not completed / mismatch", { paymentID, result });
    return { orderId: order._id, paid: false };
  }

  const settled = await settleGatewayPayment(order._id, "bkash", {
    transactionId: result.trxID,
    gatewayPaymentId: paymentID,
  });
  return { orderId: order._id, ...settled };
}
