import "server-only";
import { backendClient } from "@/sanity/lib/backendClient";
import { calcDelivery, calcTax, round2, storeConfig } from "@/lib/storeConfig";
import { getStoreSettings } from "@/lib/storeSettings";
import { checkQuantityCaps, couponAvailabilityError } from "@/lib/orderGuards";

// Single source of truth for order totals. Every price comes from Sanity —
// never from the browser — so totals cannot be tampered with.

export interface CartLineInput {
  productId: string;
  quantity: number;
}

export interface PricedLine {
  productId: string;
  name: string;
  slug?: string;
  image?: unknown;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  stock: number;
}

export interface AppliedCoupon {
  _id: string;
  code: string;
  discountType: "percent" | "fixed";
  value: number;
  amount: number;
}

export interface PricingResult {
  lines: PricedLine[];
  subtotal: number;
  businessDiscount: number;
  coupon: AppliedCoupon | null;
  couponError?: string;
  discountTotal: number;
  /** Delivery charge (same for every payment method) */
  shipping: number;
  /** How much more to spend for free delivery (0 = already free / not offered) */
  freeDeliveryLeft: number;
  tax: number;
  total: number;
  currency: string;
}

export class PricingError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

interface CouponDoc {
  _id: string;
  code: string;
  discountType: "percent" | "fixed";
  value: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  startsAt?: string;
  expiresAt?: string;
  usageLimit?: number;
  usedCount?: number;
  oncePerCustomer?: boolean;
  active?: boolean;
}

/** Accepts both `{productId, quantity}` and legacy cart items `{product: {_id}, quantity}` */
export function normalizeCartInput(items: unknown): CartLineInput[] {
  if (!Array.isArray(items)) return [];
  const merged = new Map<string, number>();
  for (const raw of items) {
    const item = raw as { productId?: string; product?: { _id?: string }; quantity?: number };
    const productId = item?.productId || item?.product?._id;
    const quantity = Math.floor(Number(item?.quantity));
    if (!productId || typeof productId !== "string" || !(quantity > 0)) continue;
    merged.set(productId, (merged.get(productId) || 0) + Math.min(quantity, 999));
  }
  return [...merged].map(([productId, quantity]) => ({ productId, quantity }));
}

export const normalizeCouponCode = (code: unknown) =>
  typeof code === "string" ? code.trim().toUpperCase().slice(0, 32) : "";

/**
 * Once-per-customer rule. A use is any non-cancelled order with the code, matched by
 * Clerk user id or by a VERIFIED email (orders store `emailVerified: false` when the
 * address was not verified, so nobody can burn someone else's coupon by typing their
 * email). Usage is counted when the order is placed; the order and the coupon's
 * `usedCount` are written in one revision-locked transaction (see lockCouponForOrder),
 * so two simultaneous orders cannot both slip through.
 */
async function customerHasUsedCoupon(
  code: string,
  customer: { clerkUserId?: string | null; email?: string | null }
): Promise<boolean> {
  const used = await backendClient.fetch<number>(
    `count(*[_type == "order" && upper(couponCode) == $code && status != "cancelled" && (
      ($uid != "" && clerkUserId == $uid) ||
      ($email != "" && lower(email) == $email && emailVerified != false)
    )])`,
    { code, uid: customer.clerkUserId || "", email: (customer.email || "").toLowerCase() }
  );
  return used > 0;
}

/**
 * Called right before the order transaction is committed: re-reads the coupon with
 * its revision and re-checks everything that can change (active, dates, usage limit,
 * once-per-customer). The caller patches the coupon with `ifRevisionId(_rev)` in the
 * same transaction as the order, so the usage limit can never be exceeded.
 */
export async function lockCouponForOrder(
  couponId: string,
  customer: { clerkUserId?: string | null; email?: string | null }
): Promise<{ _id: string; _rev: string }> {
  const doc = await backendClient.fetch<(CouponDoc & { _rev: string }) | null>(
    `*[_type == "coupon" && _id == $couponId][0]`,
    { couponId }
  );
  const error = couponAvailabilityError(doc);
  if (error || !doc) throw new PricingError(error || "This coupon code is not valid", 409);
  if (doc.oncePerCustomer && (await customerHasUsedCoupon(doc.code.toUpperCase(), customer))) {
    throw new PricingError("You have already used this coupon", 409);
  }
  return { _id: doc._id, _rev: doc._rev };
}

async function evaluateCoupon(
  code: string,
  eligibleAmount: number,
  customer: { clerkUserId?: string | null; email?: string | null }
): Promise<{ coupon: AppliedCoupon | null; error?: string }> {
  const doc = await backendClient.fetch<CouponDoc | null>(
    `*[_type == "coupon" && upper(code) == $code][0]`,
    { code }
  );
  if (!doc || doc.active === false) return { coupon: null, error: "This coupon code is not valid" };

  const now = Date.now();
  if (doc.startsAt && new Date(doc.startsAt).getTime() > now)
    return { coupon: null, error: "This coupon is not active yet" };
  if (doc.expiresAt && new Date(doc.expiresAt).getTime() < now)
    return { coupon: null, error: "This coupon has expired" };
  if (doc.usageLimit && (doc.usedCount || 0) >= doc.usageLimit)
    return { coupon: null, error: "This coupon has reached its usage limit" };
  if (doc.minOrderAmount && eligibleAmount < doc.minOrderAmount)
    return {
      coupon: null,
      error: `Spend at least ${doc.minOrderAmount} to use this coupon`,
    };

  if (doc.oncePerCustomer && (customer.clerkUserId || customer.email)) {
    if (await customerHasUsedCoupon(code, customer)) {
      return { coupon: null, error: "You have already used this coupon" };
    }
  }

  let amount =
    doc.discountType === "percent"
      ? (eligibleAmount * Math.min(doc.value, 100)) / 100
      : doc.value;
  if (doc.discountType === "percent" && doc.maxDiscountAmount) {
    amount = Math.min(amount, doc.maxDiscountAmount);
  }
  amount = round2(Math.min(amount, eligibleAmount));

  return {
    coupon: {
      _id: doc._id,
      code: doc.code.toUpperCase(),
      discountType: doc.discountType,
      value: doc.value,
      amount,
    },
  };
}

export async function priceCart(
  items: CartLineInput[],
  options: {
    couponCode?: string;
    clerkUserId?: string | null;
    /** Only a Clerk-VERIFIED email may be passed here (see verifiedEmailOf) */
    email?: string | null;
    /** When true an invalid coupon throws instead of being reported */
    strictCoupon?: boolean;
  } = {}
): Promise<PricingResult> {
  if (items.length === 0) throw new PricingError("Your cart is empty");

  const products = await backendClient.fetch<
    { _id: string; name?: string; slug?: string; price?: number; stock?: number; image?: unknown }[]
  >(
    `*[_type == "product" && _id in $ids]{ _id, name, "slug": slug.current, price, stock, "image": images[0] }`,
    { ids: items.map((i) => i.productId) }
  );
  const byId = new Map(products.map((p) => [p._id, p]));

  const capError = checkQuantityCaps(
    items.map((i) => ({ quantity: i.quantity, name: byId.get(i.productId)?.name }))
  );
  if (capError) throw new PricingError(capError);

  const lines: PricedLine[] = items.map(({ productId, quantity }) => {
    const p = byId.get(productId);
    if (!p || typeof p.price !== "number") {
      throw new PricingError("One of the products in your cart is no longer available");
    }
    const stock = typeof p.stock === "number" ? p.stock : 0;
    if (stock <= 0) throw new PricingError(`"${p.name}" is out of stock`);
    if (quantity > stock) {
      throw new PricingError(`Only ${stock} of "${p.name}" left in stock`);
    }
    return {
      productId,
      name: p.name || "Product",
      slug: p.slug,
      image: p.image,
      unitPrice: p.price,
      quantity,
      lineTotal: round2(p.price * quantity),
      stock,
    };
  });

  const subtotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));

  // Business account discount
  let businessDiscount = 0;
  if (options.clerkUserId || options.email) {
    // `email` must be a verified address (callers pass null otherwise)
    const isBusiness = await backendClient.fetch<boolean>(
      `count(*[_type in ["user", "userType"] && isBusiness == true && (
        ($uid != "" && clerkUserId == $uid) || ($email != "" && lower(email) == $email)
      )]) > 0`,
      { uid: options.clerkUserId || "", email: (options.email || "").toLowerCase() }
    );
    if (isBusiness) businessDiscount = round2(subtotal * storeConfig.businessDiscountRate);
  }

  const afterBusiness = round2(subtotal - businessDiscount);

  // Coupon
  let coupon: AppliedCoupon | null = null;
  let couponError: string | undefined;
  const code = normalizeCouponCode(options.couponCode);
  if (code) {
    const result = await evaluateCoupon(code, afterBusiness, {
      clerkUserId: options.clerkUserId,
      email: options.email,
    });
    coupon = result.coupon;
    couponError = result.error;
    if (!coupon && options.strictCoupon) throw new PricingError(couponError || "Invalid coupon");
  }

  const discountTotal = round2(businessDiscount + (coupon?.amount || 0));
  const discounted = round2(Math.max(0, subtotal - discountTotal));
  // Delivery charge from Admin → Settings, the same for every payment method.
  // The free-delivery amount is judged on the pre-coupon amount.
  const delivery = await getStoreSettings();
  const shipping = calcDelivery(afterBusiness, delivery);
  const freeDeliveryLeft =
    shipping > 0 && delivery.freeDeliveryOver > 0 ? round2(delivery.freeDeliveryOver - afterBusiness) : 0;
  const tax = calcTax(discounted);
  const total = round2(discounted + shipping + tax);

  return {
    lines,
    subtotal,
    businessDiscount,
    coupon,
    couponError,
    discountTotal,
    shipping,
    freeDeliveryLeft,
    tax,
    total,
    currency: storeConfig.currency,
  };
}

interface ClerkEmailLike {
  emailAddress?: string | null;
  verification?: { status?: string | null } | null;
}

/**
 * The customer's verified email (primary first, then any other verified address), or
 * null. Discounts and once-per-customer checks must never trust an unverified address.
 */
export function verifiedEmailOf(
  user: { primaryEmailAddress?: ClerkEmailLike | null; emailAddresses?: ClerkEmailLike[] | null } | null | undefined
): string | null {
  const isVerified = (e?: ClerkEmailLike | null) =>
    Boolean(e?.emailAddress) && e?.verification?.status === "verified";
  if (isVerified(user?.primaryEmailAddress)) return user!.primaryEmailAddress!.emailAddress!.toLowerCase();
  const other = (user?.emailAddresses || []).find(isVerified);
  return other ? other.emailAddress!.toLowerCase() : null;
}
