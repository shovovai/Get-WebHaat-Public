import "server-only";
import crypto from "crypto";
import { backendClient } from "@/sanity/lib/backendClient";
import { cmsFetch } from "@/sanity/lib/fetch";
import { TAGS } from "@/lib/cache";
import { PRIVATE_PREFIX } from "@/lib/privateId";
import { decryptSecret, encryptSecret, maskSecret } from "@/lib/secretBox";

// Payment gateway settings, editable from Admin → Payments.
// Stored in the Sanity singleton "private.paymentSettings" with secrets encrypted
// (a private id: only token-authenticated requests can read it).
// .env values are used as fallback (and for Stripe/SSLCommerz compatibility).

export const PAYMENT_SETTINGS_ID = `${PRIVATE_PREFIX}paymentSettings`;
/** Pre-migration public id, still read until the doc has been moved */
const LEGACY_PAYMENT_SETTINGS_ID = "paymentSettings";

export type ManualProvider = "bkash" | "nagad" | "rocket" | "upay" | "bank" | "other";

export interface ManualAccount {
  id: string;
  provider: ManualProvider;
  label: string;
  accountNumber: string;
  accountType: "personal" | "agent" | "merchant" | "bank";
  instructions: string;
  enabled: boolean;
}

export interface PaymentConfig {
  cod: { enabled: boolean; label: string; instructions: string; maxOrderAmount: number };
  bkash: {
    enabled: boolean;
    label: string;
    sandbox: boolean;
    appKey: string;
    appSecret: string;
    username: string;
    password: string;
  };
  nagad: {
    enabled: boolean;
    label: string;
    sandbox: boolean;
    merchantId: string;
    merchantNumber: string;
    merchantPrivateKey: string;
    pgPublicKey: string;
  };
  sslcommerz: { enabled: boolean; label: string; sandbox: boolean; storeId: string; storePassword: string };
  stripe: { enabled: boolean; label: string; secretKey: string; webhookSecret: string };
  manual: { enabled: boolean; label: string; accounts: ManualAccount[] };
}

type GatewayKey = keyof PaymentConfig;

/** Fields that are encrypted at rest and masked in the admin UI */
export const SECRET_FIELDS: Partial<Record<GatewayKey, string[]>> = {
  bkash: ["appSecret", "password"],
  nagad: ["merchantPrivateKey"],
  sslcommerz: ["storePassword"],
  stripe: ["secretKey", "webhookSecret"],
};

export function defaultPaymentConfig(): PaymentConfig {
  return {
    cod: {
      enabled: true,
      label: "Cash on delivery",
      instructions: "Pay in cash when your order arrives.",
      maxOrderAmount: 0,
    },
    bkash: {
      enabled: false,
      label: "bKash",
      sandbox: true,
      appKey: "",
      appSecret: "",
      username: "",
      password: "",
    },
    nagad: {
      enabled: false,
      label: "Nagad",
      sandbox: true,
      merchantId: "",
      merchantNumber: "",
      merchantPrivateKey: "",
      pgPublicKey: "",
    },
    sslcommerz: {
      enabled: Boolean(process.env.SSLCOMMERZ_STORE_ID && process.env.SSLCOMMERZ_STORE_PASSWORD),
      label: "Cards & mobile banking (SSLCommerz)",
      sandbox: process.env.SSLCOMMERZ_SANDBOX !== "false",
      storeId: process.env.SSLCOMMERZ_STORE_ID || "",
      storePassword: process.env.SSLCOMMERZ_STORE_PASSWORD || "",
    },
    stripe: {
      enabled: Boolean(process.env.STRIPE_SECRET_KEY),
      label: "Credit / debit card",
      secretKey: process.env.STRIPE_SECRET_KEY || "",
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
    },
    manual: { enabled: false, label: "Send money (manual)", accounts: [] },
  };
}

/** Deep-merges stored values over defaults; empty stored secrets fall back to .env */
function merge(stored: Partial<PaymentConfig> | null): PaymentConfig {
  const base = defaultPaymentConfig();
  if (!stored) return base;
  const out = { ...base } as PaymentConfig;
  for (const k of Object.keys(base) as GatewayKey[]) {
    const s = (stored as Record<string, unknown>)[k];
    if (!s || typeof s !== "object") continue;
    const merged = { ...(base[k] as object) } as Record<string, unknown>;
    for (const [field, value] of Object.entries(s as Record<string, unknown>)) {
      if (value === undefined || value === null) continue;
      const isSecret = SECRET_FIELDS[k]?.includes(field);
      if (isSecret) {
        const plain = decryptSecret(String(value));
        if (plain) merged[field] = plain;
      } else if (value !== "" || typeof merged[field] !== "string") {
        merged[field] = value;
      }
    }
    (out as unknown as Record<string, unknown>)[k] = merged;
  }
  return out;
}

async function loadStored(fresh: boolean): Promise<Partial<PaymentConfig> | null> {
  try {
    // Prefer the private doc ("private.…" sorts after "paymentSettings")
    const query = `*[_id in $ids] | order(_id desc)[0]{ config }`;
    const params = { ids: [PAYMENT_SETTINGS_ID, LEGACY_PAYMENT_SETTINGS_ID] };
    // Cached (tag "paymentSettings", invalidated on save and by the Sanity
    // webhook); `fresh` bypasses the cache (admin editor, before saving)
    const doc = fresh
      ? await backendClient.fetch<{ config?: string } | null>(query, params, { cache: "no-store" })
      : await cmsFetch<{ config?: string } | null>(query, params, { tags: [TAGS.paymentSettings] });
    return doc?.config ? JSON.parse(doc.config) : null;
  } catch (error) {
    console.error("Failed to load payment settings:", error);
    return null;
  }
}

/** Full config with decrypted secrets — SERVER USE ONLY */
export async function getPaymentConfig(options: { fresh?: boolean } = {}): Promise<PaymentConfig> {
  return merge(await loadStored(Boolean(options.fresh)));
}

/** Config safe to send to the admin UI (secrets replaced with masked previews) */
export function maskConfig(config: PaymentConfig) {
  const copy = JSON.parse(JSON.stringify(config)) as Record<string, Record<string, unknown>>;
  for (const [gateway, fields] of Object.entries(SECRET_FIELDS)) {
    for (const f of fields || []) {
      const v = String(copy[gateway][f] || "");
      copy[gateway][f] = "";
      copy[gateway][`${f}Preview`] = maskSecret(v);
    }
  }
  return copy;
}

const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
const text = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const money = (v: unknown) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : 0);

/**
 * Validates admin input and saves it. Secret fields left blank keep their
 * current value (the UI never receives the real secrets).
 */
export async function savePaymentConfig(input: Record<string, Record<string, unknown>>, adminEmail: string) {
  const current = await getPaymentConfig({ fresh: true });
  const next = JSON.parse(JSON.stringify(current)) as PaymentConfig;

  const g = (k: GatewayKey) => (input?.[k] && typeof input[k] === "object" ? input[k] : {});

  const cod = g("cod");
  next.cod = {
    enabled: bool(cod.enabled, current.cod.enabled),
    label: text(cod.label, 60) || current.cod.label,
    instructions: text(cod.instructions, 500),
    maxOrderAmount: money(cod.maxOrderAmount),
  };

  const bk = g("bkash");
  next.bkash = {
    ...current.bkash,
    enabled: bool(bk.enabled, current.bkash.enabled),
    label: text(bk.label, 60) || current.bkash.label,
    sandbox: bool(bk.sandbox, current.bkash.sandbox),
    appKey: text(bk.appKey, 200),
    username: text(bk.username, 100),
  };
  const ng = g("nagad");
  next.nagad = {
    ...current.nagad,
    enabled: bool(ng.enabled, current.nagad.enabled),
    label: text(ng.label, 60) || current.nagad.label,
    sandbox: bool(ng.sandbox, current.nagad.sandbox),
    merchantId: text(ng.merchantId, 60),
    merchantNumber: text(ng.merchantNumber, 20),
    pgPublicKey: text(ng.pgPublicKey, 5000),
  };
  const ssl = g("sslcommerz");
  next.sslcommerz = {
    ...current.sslcommerz,
    enabled: bool(ssl.enabled, current.sslcommerz.enabled),
    label: text(ssl.label, 60) || current.sslcommerz.label,
    sandbox: bool(ssl.sandbox, current.sslcommerz.sandbox),
    storeId: text(ssl.storeId, 100),
  };
  const st = g("stripe");
  next.stripe = {
    ...current.stripe,
    enabled: bool(st.enabled, current.stripe.enabled),
    label: text(st.label, 60) || current.stripe.label,
  };

  // Secrets: only replace when a new value was typed
  for (const [gateway, fields] of Object.entries(SECRET_FIELDS) as [GatewayKey, string[]][]) {
    for (const f of fields) {
      const v = g(gateway)[f];
      if (typeof v === "string" && v.trim()) {
        (next[gateway] as unknown as Record<string, unknown>)[f] = v.trim().slice(0, 5000);
      }
    }
  }

  const manual = g("manual");
  const accounts = Array.isArray(manual.accounts) ? manual.accounts : current.manual.accounts;
  next.manual = {
    enabled: bool(manual.enabled, current.manual.enabled),
    label: text(manual.label, 60) || current.manual.label,
    accounts: (accounts as Record<string, unknown>[]).slice(0, 20).map((a) => ({
      id: text(a.id, 40) || crypto.randomUUID().slice(0, 8),
      provider: (["bkash", "nagad", "rocket", "upay", "bank", "other"].includes(String(a.provider))
        ? a.provider
        : "other") as ManualProvider,
      label: text(a.label, 60) || "Manual payment",
      accountNumber: text(a.accountNumber, 60),
      accountType: (["personal", "agent", "merchant", "bank"].includes(String(a.accountType))
        ? a.accountType
        : "personal") as ManualAccount["accountType"],
      instructions: text(a.instructions, 800),
      enabled: bool(a.enabled, true),
    })),
  };

  // Validation for enabled gateways
  const problems: string[] = [];
  if (next.bkash.enabled && (!next.bkash.appKey || !next.bkash.appSecret || !next.bkash.username || !next.bkash.password))
    problems.push("bKash needs App key, App secret, Username and Password");
  if (next.nagad.enabled && (!next.nagad.merchantId || !next.nagad.merchantPrivateKey || !next.nagad.pgPublicKey))
    problems.push("Nagad needs Merchant ID, Merchant private key and Nagad public key");
  if (next.sslcommerz.enabled && (!next.sslcommerz.storeId || !next.sslcommerz.storePassword))
    problems.push("SSLCommerz needs Store ID and Store password");
  if (next.stripe.enabled && !next.stripe.secretKey) problems.push("Stripe needs a Secret key");
  if (next.manual.enabled && !next.manual.accounts.some((a) => a.enabled && a.accountNumber))
    problems.push("Manual payments need at least one enabled account with a number");
  if (problems.length) return { ok: false as const, error: problems.join(". ") };

  // Encrypt secrets for storage
  const stored = JSON.parse(JSON.stringify(next)) as Record<string, Record<string, unknown>>;
  for (const [gateway, fields] of Object.entries(SECRET_FIELDS)) {
    for (const f of fields || []) {
      stored[gateway][f] = encryptSecret(String(stored[gateway][f] || ""));
    }
  }

  await backendClient.createIfNotExists({ _id: PAYMENT_SETTINGS_ID, _type: "paymentSettings" });
  await backendClient
    .patch(PAYMENT_SETTINGS_ID)
    .set({ config: JSON.stringify(stored), updatedAt: new Date().toISOString(), updatedBy: adminEmail })
    .commit();

  return { ok: true as const, config: next };
}

// ---------- Checkout-facing helpers (no secrets) ----------

export interface PaymentOption {
  id: string; // cash_on_delivery | bkash | nagad | sslcommerz | stripe | manual:<accountId>
  method: string; // stored as order.paymentMethod
  label: string;
  description: string;
  kind: "offline" | "gateway" | "manual";
  provider?: ManualProvider;
  accountNumber?: string;
  accountType?: string;
  instructions?: string;
}

export function paymentOptionsFrom(config: PaymentConfig, orderTotal?: number): PaymentOption[] {
  const options: PaymentOption[] = [];
  const codAllowed =
    config.cod.enabled && (!config.cod.maxOrderAmount || orderTotal === undefined || orderTotal <= config.cod.maxOrderAmount);
  if (codAllowed) {
    options.push({
      id: "cash_on_delivery",
      method: "cash_on_delivery",
      label: config.cod.label,
      description: config.cod.instructions,
      kind: "offline",
    });
  }
  if (config.bkash.enabled && config.bkash.appKey)
    options.push({ id: "bkash", method: "bkash", label: config.bkash.label, description: "Pay securely with your bKash account", kind: "gateway" });
  if (config.nagad.enabled && config.nagad.merchantId)
    options.push({ id: "nagad", method: "nagad", label: config.nagad.label, description: "Pay securely with your Nagad account", kind: "gateway" });
  if (config.sslcommerz.enabled && config.sslcommerz.storeId)
    options.push({ id: "sslcommerz", method: "sslcommerz", label: config.sslcommerz.label, description: "bKash, Nagad, Rocket & cards via SSLCommerz", kind: "gateway" });
  if (config.stripe.enabled && config.stripe.secretKey)
    options.push({ id: "stripe", method: "stripe", label: config.stripe.label, description: "Visa, Mastercard, Amex — secured by Stripe", kind: "gateway" });
  if (config.manual.enabled) {
    for (const a of config.manual.accounts.filter((x) => x.enabled && x.accountNumber)) {
      options.push({
        id: `manual:${a.id}`,
        method: "manual",
        label: a.label,
        description: `Send money to ${a.accountNumber} (${a.accountType})`,
        kind: "manual",
        provider: a.provider,
        accountNumber: a.accountNumber,
        accountType: a.accountType,
        instructions: a.instructions,
      });
    }
  }
  return options;
}

export async function getPaymentOptions(orderTotal?: number) {
  return paymentOptionsFrom(await getPaymentConfig(), orderTotal);
}
