import "server-only";
import { getPaymentConfig, paymentOptionsFrom, type PaymentOption } from "@/lib/paymentConfig";

export type { PaymentOption };

/** Checkout payment options (no secrets), based on Admin → Payments */
export async function getCheckoutPaymentOptions(orderTotal?: number): Promise<PaymentOption[]> {
  return paymentOptionsFrom(await getPaymentConfig(), orderTotal);
}

/**
 * Resolves a checkout selection (e.g. "bkash", "manual:ab12cd") against the
 * enabled options. Returns null if that method isn't currently allowed.
 */
export async function resolvePaymentOption(id: unknown, orderTotal?: number): Promise<PaymentOption | null> {
  if (typeof id !== "string") return null;
  const options = await getCheckoutPaymentOptions(orderTotal);
  return options.find((o) => o.id === id) || null;
}
