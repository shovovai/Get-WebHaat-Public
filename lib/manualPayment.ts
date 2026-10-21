import "server-only";
import { backendClient } from "@/sanity/lib/backendClient";
import type { ManualProvider } from "@/lib/paymentConfig";

const MOBILE_WALLETS: ManualProvider[] = ["bkash", "nagad", "rocket", "upay"];

/** Normalises BD mobile numbers: +8801XXXXXXXXX / 8801… / 01… → 01XXXXXXXXX */
export function normalizeBdMobile(input: string) {
  const digits = input.replace(/\D/g, "");
  const local = digits.startsWith("880") ? "0" + digits.slice(3) : digits;
  return /^01[3-9]\d{8}$/.test(local) ? local : null;
}

/**
 * Validates what the customer typed after sending money manually.
 * Returns clean values or an error message.
 */
export async function validateManualSubmission(
  provider: ManualProvider,
  input: { senderNumber?: unknown; transactionId?: unknown },
  excludeOrderId?: string
): Promise<{ ok: true; senderNumber: string; transactionId: string } | { ok: false; error: string }> {
  const rawSender = typeof input.senderNumber === "string" ? input.senderNumber.trim() : "";
  const rawTrx = typeof input.transactionId === "string" ? input.transactionId.trim() : "";

  let senderNumber = rawSender.slice(0, 40);
  if (MOBILE_WALLETS.includes(provider)) {
    const n = normalizeBdMobile(rawSender);
    if (!n) return { ok: false, error: "Enter the mobile number you sent the money from (e.g. 01712345678)" };
    senderNumber = n;
  } else if (senderNumber.length < 3) {
    return { ok: false, error: "Enter the account / sender reference you paid from" };
  } else if (!/^[A-Za-z0-9+\- ]+$/.test(senderNumber)) {
    // Shown to admins in emails and the dashboard: keep it to plain account-number characters
    return { ok: false, error: "The sender account may only contain letters, digits, spaces, + and -" };
  }

  const transactionId = rawTrx.toUpperCase().replace(/\s/g, "");
  if (!/^[A-Z0-9-]{6,30}$/.test(transactionId)) {
    return { ok: false, error: "Enter the transaction ID (TrxID) from your payment confirmation SMS" };
  }

  // A transaction ID can only be used once (unless that payment was rejected)
  const used = await backendClient.fetch<number>(
    `count(*[_type == "order" && manualPayment.transactionId == $trx && paymentStatus != "failed" && _id != $exclude])`,
    { trx: transactionId, exclude: excludeOrderId || "" }
  );
  if (used > 0) {
    return { ok: false, error: "This transaction ID was already used for another order" };
  }
  return { ok: true, senderNumber, transactionId };
}
