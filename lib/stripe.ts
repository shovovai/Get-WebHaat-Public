import "server-only";
import Stripe from "stripe";
import { getPaymentConfig } from "@/lib/paymentConfig";

// Stripe is optional. Keys come from Admin → Payments (falls back to .env).
let cached: { key: string; client: Stripe } | null = null;

/**
 * Returns a Stripe client using the configured secret key.
 * `requireEnabled: false` is used by webhooks/refunds so existing card
 * payments keep working even after the gateway is switched off for checkout.
 */
export async function getStripeClient(options: { requireEnabled?: boolean } = {}): Promise<Stripe> {
  const { stripe } = await getPaymentConfig();
  if (!stripe.secretKey || (options.requireEnabled !== false && !stripe.enabled)) {
    throw new Error("Stripe is not configured. Add the keys in Admin → Payments.");
  }
  if (!cached || cached.key !== stripe.secretKey) {
    cached = {
      key: stripe.secretKey,
      client: new Stripe(stripe.secretKey, { apiVersion: "2025-10-29.clover" }),
    };
  }
  return cached.client;
}

export async function getStripeWebhookSecret(): Promise<string> {
  return (await getPaymentConfig()).stripe.webhookSecret;
}
