import "server-only";
import crypto from "crypto";

// AES-256-GCM encryption for gateway credentials stored in Sanity.
// Key comes from PAYMENT_ENCRYPTION_KEY (any long random string).

const PREFIX = "enc:v1:";

function key(): Buffer {
  const secret = process.env.PAYMENT_ENCRYPTION_KEY;
  if (!secret || secret.length < 16) {
    throw new Error(
      "PAYMENT_ENCRYPTION_KEY is missing or too short. Add a long random value to .env to store payment credentials."
    );
  }
  return crypto.createHash("sha256").update(secret).digest();
}

export const hasEncryptionKey = () =>
  Boolean(process.env.PAYMENT_ENCRYPTION_KEY && process.env.PAYMENT_ENCRYPTION_KEY.length >= 16);

export function encryptSecret(plain: string): string {
  if (!plain) return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, data]).toString("base64");
}

export function decryptSecret(value: string | undefined | null): string {
  if (!value) return "";
  if (!value.startsWith(PREFIX)) return value; // plain value (e.g. legacy)
  try {
    const raw = Buffer.from(value.slice(PREFIX.length), "base64");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
  } catch (error) {
    console.error("Could not decrypt a payment secret — was PAYMENT_ENCRYPTION_KEY changed?", error);
    return "";
  }
}

/** "••••••ab12" style preview for the admin UI (never the real value) */
export function maskSecret(plain: string): string {
  if (!plain) return "";
  return "••••••" + plain.slice(-4);
}
