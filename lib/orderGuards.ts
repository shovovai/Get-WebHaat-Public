// Pure business rules for orders, stock, coupons and staff actions.
// No Sanity / Next imports here so the rules can be unit-tested with plain
// Node (see tests/order-guards.test.mjs).

/** Most units of one product a customer can buy in a single order */
export const MAX_QTY_PER_LINE = positiveInt(process.env.MAX_QTY_PER_ORDER_LINE, 10);
/** Most different products in one order */
export const MAX_LINES_PER_ORDER = 50;
/** Unpaid online orders (card / bKash / Nagad / SSLCommerz / manual) a customer may hold at once */
export const MAX_OPEN_UNPAID_ONLINE_ORDERS = positiveInt(process.env.MAX_OPEN_UNPAID_ONLINE_ORDERS, 3);
/** Cash-on-delivery orders still waiting for the call center a customer may hold at once */
export const MAX_OPEN_COD_ORDERS = positiveInt(process.env.MAX_OPEN_COD_ORDERS, 3);
/** How long stock is held for an unpaid online (gateway) order */
export const RESERVATION_MINUTES = positiveInt(process.env.STOCK_RESERVATION_MINUTES, 30);

/** Payment methods paid through a hosted gateway: their stock hold expires */
export const GATEWAY_METHODS = ["stripe", "bkash", "nagad", "sslcommerz"] as const;
export type GatewayMethod = (typeof GATEWAY_METHODS)[number];

export function isGatewayMethod(method: unknown): method is GatewayMethod {
  return typeof method === "string" && (GATEWAY_METHODS as readonly string[]).includes(method);
}

function positiveInt(raw: string | undefined, fallback: number): number {
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function reservationDeadline(now = Date.now(), minutes = RESERVATION_MINUTES): string {
  return new Date(now + minutes * 60_000).toISOString();
}

export function isReservationExpired(reservedUntil: string | null | undefined, now = Date.now()): boolean {
  if (!reservedUntil) return false;
  const t = new Date(reservedUntil).getTime();
  return Number.isFinite(t) && t <= now;
}

// ---------------------------------------------------------------- stock

export interface StockLine {
  productId: string;
  quantity: number;
}

export interface StockSnapshot {
  _id: string;
  name?: string;
  stock?: number | null;
}

/**
 * Returns the first line that cannot be covered by current stock, or null when every
 * line fits. Missing / non-numeric stock counts as 0.
 */
export function findStockShortage(
  lines: StockLine[],
  products: StockSnapshot[]
): { productId: string; name: string; available: number; requested: number } | null {
  const byId = new Map(products.map((p) => [p._id, p]));
  for (const line of lines) {
    const p = byId.get(line.productId);
    const available = typeof p?.stock === "number" && Number.isFinite(p.stock) ? p.stock : 0;
    if (!p || available < line.quantity) {
      return {
        productId: line.productId,
        name: p?.name || "A product",
        available: Math.max(0, available),
        requested: line.quantity,
      };
    }
  }
  return null;
}

/** Validates per-line quantity and number of lines. Returns an error message or null. */
export function checkQuantityCaps(
  lines: { quantity: number; name?: string }[],
  maxPerLine = MAX_QTY_PER_LINE,
  maxLines = MAX_LINES_PER_ORDER
): string | null {
  if (lines.length > maxLines) return `An order can contain at most ${maxLines} different products`;
  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1) return "Invalid quantity";
    if (line.quantity > maxPerLine) {
      return `You can order at most ${maxPerLine} of "${line.name || "this product"}" per order`;
    }
  }
  return null;
}

// ---------------------------------------------------------------- coupons

export interface CouponLimits {
  active?: boolean;
  startsAt?: string;
  expiresAt?: string;
  usageLimit?: number | null;
  usedCount?: number | null;
}

/** Re-checks the parts of a coupon that can change between quote and order. */
export function couponAvailabilityError(doc: CouponLimits | null | undefined, now = Date.now()): string | null {
  if (!doc || doc.active === false) return "This coupon code is not valid";
  if (doc.startsAt && new Date(doc.startsAt).getTime() > now) return "This coupon is not active yet";
  if (doc.expiresAt && new Date(doc.expiresAt).getTime() < now) return "This coupon has expired";
  if (doc.usageLimit && (doc.usedCount || 0) >= doc.usageLimit) {
    return "This coupon has reached its usage limit";
  }
  return null;
}

// ---------------------------------------------------------------- optimistic locking

/** Sanity answers 409 when an `ifRevisionId` precondition fails (or a create collides) */
export function isRevisionConflict(error: unknown): boolean {
  const e = error as { statusCode?: number; response?: { statusCode?: number } } | null;
  return e?.statusCode === 409 || e?.response?.statusCode === 409;
}

export class ConflictRetryExhausted extends Error {
  constructor() {
    super("The record changed several times while saving. Please try again.");
  }
}

/**
 * Runs `attempt` until it succeeds, retrying (with a short jittered back-off) when it
 * throws a revision conflict. Other errors propagate immediately.
 */
export async function withRevisionRetry<T>(attempt: () => Promise<T>, maxAttempts = 5): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await attempt();
    } catch (error) {
      if (!isRevisionConflict(error)) throw error;
      if (i >= maxAttempts) throw new ConflictRetryExhausted();
      await new Promise((r) => setTimeout(r, 25 * i + Math.floor(Math.random() * 50)));
    }
  }
}

// ---------------------------------------------------------------- staff workflow

export type EmployeeAction =
  | "confirmAddress"
  | "updateShippingAddress"
  | "confirmOrder"
  | "markAsPacked"
  | "assignDeliveryman"
  | "startDelivery"
  | "rescheduleDelivery"
  | "markDeliveryFailed"
  | "collectCash"
  | "markAsDelivered"
  | "submitCashToAccounts"
  | "receivePayment"
  | "rejectCashSubmission";

/** Order statuses each staff action may start from */
export const ALLOWED_FROM: Record<EmployeeAction, readonly string[]> = {
  confirmAddress: ["pending"],
  updateShippingAddress: ["pending"],
  confirmOrder: ["address_confirmed"],
  markAsPacked: ["order_confirmed"],
  assignDeliveryman: ["packed", "ready_for_delivery"],
  startDelivery: ["ready_for_delivery", "rescheduled", "failed_delivery"],
  rescheduleDelivery: ["ready_for_delivery", "out_for_delivery", "rescheduled", "failed_delivery"],
  markDeliveryFailed: ["ready_for_delivery", "out_for_delivery", "rescheduled"],
  collectCash: ["ready_for_delivery", "out_for_delivery", "rescheduled"],
  markAsDelivered: ["ready_for_delivery", "out_for_delivery", "rescheduled"],
  submitCashToAccounts: ["delivered"],
  receivePayment: ["delivered"],
  rejectCashSubmission: ["delivered"],
};

export function transitionError(action: EmployeeAction, order: { status?: string; cancellationRequested?: boolean } | null): string | null {
  if (!order) return "Order not found";
  const status = order.status || "pending";
  if (status === "cancelled") return "This order has been cancelled";
  if (order.cancellationRequested && !["receivePayment", "rejectCashSubmission", "submitCashToAccounts"].includes(action)) {
    return "The customer asked to cancel this order. Wait for an admin to decide first.";
  }
  if (!ALLOWED_FROM[action].includes(status)) {
    return `This action is not allowed while the order is "${status.replace(/_/g, " ")}"`;
  }
  return null;
}

/** Cash collected must equal the order total (to the cent) */
export function cashAmountError(cashAmount: unknown, totalPrice: unknown): string | null {
  const amount = Number(cashAmount);
  const total = Number(totalPrice);
  if (!Number.isFinite(amount) || amount <= 0) return "Enter the amount collected";
  if (!Number.isFinite(total) || total <= 0) return "Order total is invalid";
  if (Math.round(amount * 100) !== Math.round(total * 100)) {
    return "The cash collected must match the order total exactly";
  }
  return null;
}

// ---------------------------------------------------------------- customer cancellation

/** Customers may ask to cancel only before the order is packed and before any cash was collected */
export const CUSTOMER_CANCELLABLE_STATUSES = ["pending", "address_confirmed", "order_confirmed"] as const;

export function customerCancellationError(order: {
  status?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  cashCollected?: boolean;
  cancellationRequested?: boolean;
} | null): string | null {
  if (!order) return "Order not found";
  const status = order.status || "pending";
  if (status === "cancelled") return "Order is already cancelled";
  if (order.cancellationRequested) return "Cancellation request already pending admin approval";
  if (!(CUSTOMER_CANCELLABLE_STATUSES as readonly string[]).includes(status)) {
    return "This order can no longer be cancelled online. Please contact support.";
  }
  if (order.paymentMethod === "cash_on_delivery" && (order.cashCollected || order.paymentStatus === "paid")) {
    return "This order has already been paid in cash. Please contact support.";
  }
  return null;
}

// ---------------------------------------------------------------- wallet

/** True when the wallet history already holds a credit for this order (idempotency key) */
export function hasCreditForOrder(
  transactions: { type?: string; orderId?: string; status?: string }[] | null | undefined,
  orderId: string | undefined,
  type = "credit_refund"
): boolean {
  if (!orderId) return false;
  return (transactions || []).some((t) => t?.type === type && t?.orderId === orderId && t?.status !== "failed");
}

// ---------------------------------------------------------------- audit helpers

/** Picks the keys whose value differs between before and after */
export function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): { before: Record<string, unknown>; after: Record<string, unknown> } {
  const b: Record<string, unknown> = {};
  const a: Record<string, unknown> = {};
  for (const key of Object.keys(after)) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      b[key] = before[key] ?? null;
      a[key] = after[key] ?? null;
    }
  }
  return { before: b, after: a };
}

