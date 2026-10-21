import "server-only";
import crypto from "crypto";
import { backendClient } from "@/sanity/lib/backendClient";
import { brand } from "@/config/brand";
import { getPaymentConfig } from "@/lib/paymentConfig";
import { CheckoutError, settleGatewayPayment, type PayableOrder } from "@/lib/stripeCheckout";
import { releaseUnpaidOrderStock } from "@/lib/stock";

// Nagad online payment (merchant checkout API v-0.2.0).
// Request bodies are RSA-encrypted with Nagad's public key and signed with
// the merchant private key (SHA256withRSA), as required by Nagad.

type NagadCfg = Awaited<ReturnType<typeof getPaymentConfig>>["nagad"];

const baseUrl = (sandbox: boolean) =>
  sandbox
    ? "http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs"
    : "https://api.mynagad.com/api/dfs";

async function config(): Promise<NagadCfg> {
  const { nagad } = await getPaymentConfig();
  if (!nagad.enabled || !nagad.merchantId || !nagad.merchantPrivateKey || !nagad.pgPublicKey) {
    throw new CheckoutError("Nagad is not configured", 503);
  }
  return nagad;
}

/** Accepts full PEM or the bare base64 key Nagad gives merchants */
function toKeyObject(raw: string, kind: "public" | "private") {
  const trimmed = raw.trim();
  if (trimmed.includes("-----BEGIN")) {
    return kind === "public" ? crypto.createPublicKey(trimmed) : crypto.createPrivateKey(trimmed);
  }
  const body = trimmed.replace(/\s+/g, "").match(/.{1,64}/g)?.join("\n") || "";
  if (kind === "public") {
    return crypto.createPublicKey(`-----BEGIN PUBLIC KEY-----\n${body}\n-----END PUBLIC KEY-----`);
  }
  try {
    return crypto.createPrivateKey(`-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----`);
  } catch {
    return crypto.createPrivateKey(`-----BEGIN RSA PRIVATE KEY-----\n${body}\n-----END RSA PRIVATE KEY-----`);
  }
}

function dhakaDateTime() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "00";
  return `${get("year")}${get("month")}${get("day")}${get("hour")}${get("minute")}${get("second")}`;
}

function crypt(cfg: NagadCfg) {
  const pub = toKeyObject(cfg.pgPublicKey, "public");
  const priv = toKeyObject(cfg.merchantPrivateKey, "private");
  return {
    encrypt: (data: object) =>
      crypto
        .publicEncrypt({ key: pub, padding: crypto.constants.RSA_PKCS1_PADDING }, Buffer.from(JSON.stringify(data)))
        .toString("base64"),
    sign: (data: object) => crypto.sign("sha256", Buffer.from(JSON.stringify(data)), priv).toString("base64"),
    decrypt: (b64: string) =>
      JSON.parse(
        crypto
          .privateDecrypt({ key: priv, padding: crypto.constants.RSA_PKCS1_PADDING }, Buffer.from(b64, "base64"))
          .toString("utf8")
      ),
  };
}

const headers = (clientIp: string) => ({
  "Content-Type": "application/json",
  Accept: "application/json",
  "X-KM-Api-Version": "v-0.2.0",
  "X-KM-IP-V4": clientIp || "127.0.0.1",
  "X-KM-Client-Type": "PC_WEB",
});

/** Starts a Nagad payment for the stored order total; returns the Nagad page URL */
export async function createNagadPayment(order: PayableOrder, clientIp: string): Promise<string> {
  if ((order.currency || "").toUpperCase() !== "BDT") {
    throw new CheckoutError("Nagad payments require the store currency to be BDT", 400);
  }
  const cfg = await config();
  const { encrypt, sign, decrypt } = crypt(cfg);
  const base = baseUrl(cfg.sandbox);

  // Nagad order ids must be unique per attempt (max 20 alphanumeric chars)
  const nagadOrderId = (
    order.orderNumber.replace(/[^A-Za-z0-9]/g, "").slice(0, 14) + crypto.randomBytes(3).toString("hex")
  ).slice(0, 20);
  const dateTime = dhakaDateTime();

  // 1) Initialize
  const initSensitive = {
    merchantId: cfg.merchantId,
    datetime: dateTime,
    orderId: nagadOrderId,
    challenge: crypto.randomBytes(20).toString("hex"),
  };
  const initRes = await fetch(`${base}/check-out/initialize/${cfg.merchantId}/${nagadOrderId}`, {
    method: "POST",
    headers: headers(clientIp),
    body: JSON.stringify({
      ...(cfg.merchantNumber && { accountNumber: cfg.merchantNumber }),
      dateTime,
      sensitiveData: encrypt(initSensitive),
      signature: sign(initSensitive),
    }),
    cache: "no-store",
  });
  const init = await initRes.json().catch(() => null);
  if (!init?.sensitiveData) {
    console.error("Nagad initialize failed:", init);
    throw new CheckoutError("Could not connect to Nagad. Please try again.", 502);
  }
  const { paymentReferenceId, challenge } = decrypt(init.sensitiveData);

  // 2) Complete (send amount) → returns the payment page URL
  const completeSensitive = {
    merchantId: cfg.merchantId,
    orderId: nagadOrderId,
    currencyCode: "050",
    amount: order.totalPrice!.toFixed(2),
    challenge,
  };
  const completeRes = await fetch(`${base}/check-out/complete/${paymentReferenceId}`, {
    method: "POST",
    headers: headers(clientIp),
    body: JSON.stringify({
      sensitiveData: encrypt(completeSensitive),
      signature: sign(completeSensitive),
      merchantCallbackURL: `${brand.url}/api/payments/nagad/callback`,
      additionalMerchantInfo: { orderNumber: order.orderNumber },
    }),
    cache: "no-store",
  });
  const complete = await completeRes.json().catch(() => null);
  if (complete?.status !== "Success" || !complete.callBackUrl) {
    console.error("Nagad complete failed:", complete);
    throw new CheckoutError("Could not start Nagad payment. Please try again.", 502);
  }

  await backendClient.patch(order._id).set({ gatewayPaymentId: nagadOrderId }).commit();
  return complete.callBackUrl as string;
}

/** Verifies a payment reference with Nagad and marks the matching order paid */
export async function verifyNagadPayment(
  paymentRefId: string,
  clientIp: string
): Promise<{ orderId?: string; paid: boolean; refundPending?: boolean }> {
  const cfg = await config();
  const res = await fetch(`${baseUrl(cfg.sandbox)}/verify/payment/${encodeURIComponent(paymentRefId)}`, {
    headers: headers(clientIp),
    cache: "no-store",
  });
  const v = await res.json().catch(() => null);
  const nagadOrderId = v?.orderId as string | undefined;
  if (!nagadOrderId) return { orderId: undefined, paid: false };

  const order = await backendClient.fetch<{ _id: string; totalPrice: number; paymentStatus?: string } | null>(
    // Cash-on-delivery orders keep their method until an online payment succeeds
    `*[_type == "order" && paymentMethod in ["nagad", "cash_on_delivery"] && gatewayPaymentId == $id][0]{ _id, totalPrice, paymentStatus }`,
    { id: nagadOrderId }
  );
  if (!order) return { orderId: undefined, paid: false };
  if (order.paymentStatus === "paid") return { orderId: order._id, paid: true };

  const ok = v.status === "Success" && Math.abs(Number(v.amount) - order.totalPrice) < 0.01;
  if (!ok) {
    console.error("Nagad verification failed / mismatch", v);
    // Nagad (verified server-side) says the payment did not go through: release the stock
    if (v.status !== "Success") await releaseUnpaidOrderStock(order._id);
    return { orderId: order._id, paid: false };
  }
  const settled = await settleGatewayPayment(order._id, "nagad", {
    transactionId: v.issuerPaymentRefNo || v.paymentRefId || paymentRefId,
  });
  return { orderId: order._id, ...settled };
}
