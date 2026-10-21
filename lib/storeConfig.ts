// Store-wide commerce settings. Safe to import from client and server code
// (only NEXT_PUBLIC_* variables are read). Change values in .env.

const num = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return value !== undefined && value !== "" && Number.isFinite(n) ? n : fallback;
};

export const storeConfig = {
  /** ISO 4217 code, e.g. USD, BDT, EUR, INR */
  currency: (process.env.NEXT_PUBLIC_CURRENCY || "USD").toUpperCase(),
  /** BCP 47 locale used for number formatting, e.g. en-US, en-BD, bn-BD */
  locale: process.env.NEXT_PUBLIC_LOCALE || "en-US",
  /** Orders with a subtotal at or above this ship free (0 = always free) */
  freeShippingThreshold: num(process.env.NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD, 100),
  /** Flat shipping fee below the threshold */
  shippingFee: num(process.env.NEXT_PUBLIC_SHIPPING_FEE, 10),
  /** Tax rate as a decimal: 0.05 = 5% */
  taxRate: num(process.env.NEXT_PUBLIC_TAX_RATE, 0),
  /** Extra discount for approved business accounts: 0.02 = 2% */
  businessDiscountRate: num(process.env.NEXT_PUBLIC_BUSINESS_DISCOUNT_RATE, 0.02),
  /** Shop price filter steps, e.g. "100,200,300,500" → Under 100, 100–200, … Over 500 */
  priceBuckets: (process.env.NEXT_PUBLIC_PRICE_BUCKETS || "100,200,300,500")
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isFinite(v) && v > 0)
    .sort((a, b) => a - b),
};

const formatter = new Intl.NumberFormat(storeConfig.locale, {
  style: "currency",
  currency: storeConfig.currency,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formats an amount in the store currency, e.g. "$12.50" or "BDT 1,250.00" */
export function formatPrice(amount: number | string | null | undefined): string {
  return formatter.format(Number(amount) || 0);
}

/** Rounds to 2 decimals to avoid floating point drift in totals */
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export interface DeliveryRule {
  /** Flat delivery charge per order (0 = always free) */
  deliveryCharge: number;
  /** Orders at or above this amount ship free (0 = never free) */
  freeDeliveryOver: number;
}

/** Defaults from .env, used until the admin sets them in Admin → Settings → Delivery */
export const DEFAULT_DELIVERY: DeliveryRule = {
  deliveryCharge: storeConfig.freeShippingThreshold <= 0 ? 0 : Math.max(storeConfig.shippingFee, 0),
  freeDeliveryOver: Math.max(storeConfig.freeShippingThreshold, 0),
};

/** Delivery charge for an order — the same for every payment method */
export function calcDelivery(amount: number, rule: DeliveryRule): number {
  if (amount <= 0 || rule.deliveryCharge <= 0) return 0;
  if (rule.freeDeliveryOver > 0 && amount >= rule.freeDeliveryOver) return 0;
  return round2(rule.deliveryCharge);
}

export function calcTax(taxableAmount: number): number {
  return round2(Math.max(0, taxableAmount) * storeConfig.taxRate);
}
