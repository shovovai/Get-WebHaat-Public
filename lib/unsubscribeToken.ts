import "server-only";
import crypto from "crypto";
import { brand } from "@/config/brand";

// Signed unsubscribe links, so nobody can unsubscribe someone else's address
function secret(): string {
  return (
    process.env.UNSUBSCRIBE_SECRET ||
    process.env.PAYMENT_ENCRYPTION_KEY ||
    process.env.CLERK_SECRET_KEY ||
    ""
  );
}

export function unsubscribeToken(email: string): string {
  const key = secret();
  if (!key) return "";
  return crypto
    .createHmac("sha256", key)
    .update(`unsubscribe:${email.toLowerCase().trim()}`)
    .digest("base64url")
    .slice(0, 32);
}

export function verifyUnsubscribeToken(email: string, token: unknown): boolean {
  const expected = unsubscribeToken(email);
  if (!expected || typeof token !== "string" || token.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

export function unsubscribeUrl(email: string): string {
  const params = new URLSearchParams({ email, token: unsubscribeToken(email) });
  return `${brand.url}/newsletter/unsubscribe?${params.toString()}`;
}
