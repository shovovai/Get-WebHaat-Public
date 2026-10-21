import "server-only";
import { backendClient } from "@/sanity/lib/backendClient";
import {
  findStockShortage,
  isGatewayMethod,
  GATEWAY_METHODS,
  withRevisionRetry,
  type StockLine,
} from "@/lib/orderGuards";

// Stock is taken when an order is created and given back when the order is
// cancelled, when an online payment fails, or when an unpaid online order's hold
// (`reservedUntil`) runs out.
//
// Every decrement is conditional and atomic: the product's current `_rev` is
// read, `stock >= quantity` is checked, and the patch is sent with
// `ifRevisionId`. If anything changed in between Sanity answers 409 and we retry
// with fresh numbers, so two buyers can never both take the last unit.
// Order-side flags (`stockReserved` / `stockRestored`) are also written with
// `ifRevisionId`, so a double click can never return stock twice.

export class OutOfStockError extends Error {
  status = 409;
  constructor(name: string, available: number) {
    super(available > 0 ? `Only ${available} of "${name}" left in stock` : `"${name}" is out of stock`);
  }
}

interface ProductRev {
  _id: string;
  _rev: string;
  name?: string;
  stock?: number | null;
}

interface OrderStockState {
  _id: string;
  _rev: string;
  status?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  stockReserved?: boolean;
  stockRestored?: boolean;
  reservedUntil?: string;
  couponCode?: string;
  couponUsageReturned?: boolean;
  orderNumber?: string;
  products?: { quantity?: number; productId?: string }[];
}

const ORDER_STOCK_PROJECTION = `{
  _id, _rev, status, paymentMethod, paymentStatus, stockReserved, stockRestored, reservedUntil,
  couponCode, couponUsageReturned, orderNumber,
  products[]{ quantity, "productId": product._ref }
}`;

async function fetchProducts(ids: string[]) {
  return backendClient.fetch<ProductRev[]>(
    `*[_type == "product" && _id in $ids]{ _id, _rev, name, stock }`,
    { ids }
  );
}

async function fetchOrderStock(orderId: string) {
  return backendClient.fetch<OrderStockState | null>(
    `*[_type == "order" && _id == $orderId][0]${ORDER_STOCK_PROJECTION}`,
    { orderId }
  );
}

function linesOf(order: OrderStockState): StockLine[] {
  return (order.products || [])
    .filter((p) => p.productId && p.quantity && p.quantity > 0)
    .map((p) => ({ productId: p.productId!, quantity: p.quantity! }));
}

type Tx = ReturnType<typeof backendClient.transaction>;

/** Checks stock and adds revision-locked decrements to the transaction */
async function addDecrements(tx: Tx, lines: StockLine[]) {
  const products = await fetchProducts(lines.map((l) => l.productId));
  const shortage = findStockShortage(lines, products);
  if (shortage) throw new OutOfStockError(shortage.name, shortage.available);
  const byId = new Map(products.map((p) => [p._id, p]));
  for (const line of lines) {
    const rev = byId.get(line.productId)!._rev;
    tx.patch(line.productId, (p) => p.ifRevisionId(rev).dec({ stock: line.quantity }));
  }
}

/**
 * Creates the order and takes its stock in ONE atomic transaction. `extend` can add
 * more revision-locked mutations to the same transaction (used for coupon usage).
 * Throws OutOfStockError when stock no longer covers the order.
 */
export async function createOrderWithStock(
  order: { _id: string; _type: "order" } & Record<string, unknown>,
  lines: StockLine[],
  extend?: (tx: Tx) => Promise<void>
): Promise<string> {
  return withRevisionRetry(async () => {
    const tx = backendClient.transaction();
    tx.create({ ...order, stockReserved: true, stockRestored: false });
    await addDecrements(tx, lines);
    if (extend) await extend(tx);
    await tx.commit();
    return order._id;
  });
}

/**
 * Takes stock again for an existing order whose hold was released (e.g. the customer
 * retries an online payment). `reservedUntil: null` means "no expiry".
 * Returns false when the order already holds its stock.
 */
export async function reserveOrderStock(
  orderId: string,
  opts: { reservedUntil?: string | null } = {}
): Promise<boolean> {
  return withRevisionRetry(async () => {
    const order = await fetchOrderStock(orderId);
    if (!order) throw new Error("Order not found");
    if (order.stockReserved && !order.stockRestored) {
      if (opts.reservedUntil !== undefined && isGatewayMethod(order.paymentMethod)) {
        // Already holding stock: only shorten / clear the hold, never extend it
        const current = order.reservedUntil ? new Date(order.reservedUntil).getTime() : Infinity;
        const next = opts.reservedUntil ? new Date(opts.reservedUntil).getTime() : Infinity;
        if (next < current) {
          await backendClient.patch(order._id).ifRevisionId(order._rev).set({ reservedUntil: opts.reservedUntil }).commit();
        }
      }
      return false;
    }
    const lines = linesOf(order);
    const tx = backendClient.transaction();
    if (lines.length) await addDecrements(tx, lines);
    tx.patch(order._id, (p) => {
      const patch = p.ifRevisionId(order._rev).set({ stockReserved: true, stockRestored: false });
      return opts.reservedUntil ? patch.set({ reservedUntil: opts.reservedUntil }) : patch.unset(["reservedUntil"]);
    });
    await tx.commit();
    return true;
  });
}

/**
 * Puts an order's stock back. Idempotent and race-safe.
 *  - onlyIfUnpaid: skip orders that are paid (payment failure / expiry paths)
 *  - onlyIfExpired: skip orders whose hold has not run out yet
 *  - onlyIfGateway: skip cash-on-delivery / manual orders (their stock has no expiry)
 *  - returnCoupon: also give the coupon use back (cancellations)
 * Returns true when stock was returned.
 */
export async function releaseOrderStock(
  orderId: string,
  opts: { onlyIfUnpaid?: boolean; onlyIfExpired?: boolean; onlyIfGateway?: boolean; returnCoupon?: boolean } = {}
): Promise<boolean> {
  return withRevisionRetry(async () => {
    const order = await fetchOrderStock(orderId);
    if (!order) return false;
    const holdsStock = Boolean(order.stockReserved && !order.stockRestored);
    if (opts.onlyIfUnpaid && order.paymentStatus === "paid") return false;
    if (opts.onlyIfGateway && !isGatewayMethod(order.paymentMethod)) return false;
    if (
      opts.onlyIfExpired &&
      !(order.reservedUntil && new Date(order.reservedUntil).getTime() <= Date.now())
    ) {
      return false;
    }

    const returnCoupon = Boolean(opts.returnCoupon && order.couponCode && !order.couponUsageReturned);
    if (!holdsStock && !returnCoupon) return false;

    const tx = backendClient.transaction();
    if (holdsStock) {
      for (const line of linesOf(order)) {
        tx.patch(line.productId, (p) => p.inc({ stock: line.quantity }));
      }
    }
    if (returnCoupon) {
      const coupon = await backendClient.fetch<{ _id: string; usedCount?: number } | null>(
        `*[_type == "coupon" && upper(code) == $code][0]{ _id, usedCount }`,
        { code: String(order.couponCode).toUpperCase() }
      );
      if (coupon && (coupon.usedCount || 0) > 0) {
        tx.patch(coupon._id, (p) => p.dec({ usedCount: 1 }));
      }
    }
    tx.patch(order._id, (p) =>
      p.ifRevisionId(order._rev).set({
        ...(holdsStock && {
          stockReserved: false,
          stockRestored: true,
          stockReleasedAt: new Date().toISOString(),
        }),
        ...(returnCoupon && { couponUsageReturned: true }),
      })
    );
    await tx.commit();
    return holdsStock;
  });
}

/** Cancellation path: returns stock and the coupon use. Never throws. */
export async function restoreOrderStock(orderId: string) {
  try {
    await releaseOrderStock(orderId, { returnCoupon: true });
  } catch (error) {
    console.error(`Failed to restore stock for order ${orderId}:`, error);
  }
}

/** Payment failed or was cancelled at the gateway: release an unpaid order's stock. Never throws. */
export async function releaseUnpaidOrderStock(orderId: string) {
  try {
    await releaseOrderStock(orderId, { onlyIfUnpaid: true, onlyIfGateway: true });
  } catch (error) {
    console.error(`Failed to release stock for order ${orderId}:`, error);
  }
}

/**
 * Releases stock held by unpaid online orders whose hold has expired.
 * Called by the daily cron and opportunistically when new orders are placed.
 */
export async function releaseExpiredReservations(limit = 50): Promise<number> {
  const ids = await backendClient.fetch<string[]>(
    `*[_type == "order" && paymentMethod in $methods && stockReserved == true && stockRestored != true
       && paymentStatus != "paid" && defined(reservedUntil) && reservedUntil <= $now] | order(reservedUntil asc)[0...$limit]._id`,
    { methods: [...GATEWAY_METHODS], now: new Date().toISOString(), limit }
  );
  let released = 0;
  for (const id of ids) {
    try {
      if (await releaseOrderStock(id, { onlyIfUnpaid: true, onlyIfExpired: true, onlyIfGateway: true })) released++;
    } catch (error) {
      console.error(`Failed to release expired reservation for order ${id}:`, error);
    }
  }
  return released;
}

/**
 * After a payment succeeds: make sure the order holds its stock (its hold may have
 * expired before the money arrived). If stock ran out meanwhile, the order is flagged
 * `stockShortage` for staff instead of overselling. Never throws.
 */
export async function ensureStockForPaidOrder(orderId: string): Promise<{ shortage: boolean }> {
  try {
    await reserveOrderStock(orderId, { reservedUntil: null });
    return { shortage: false };
  } catch (error) {
    if (error instanceof OutOfStockError) {
      await backendClient
        .patch(orderId)
        .set({ stockShortage: true })
        .commit()
        .catch((e) => console.error("Could not flag stock shortage:", e));
      return { shortage: true };
    }
    console.error(`Failed to secure stock for paid order ${orderId}:`, error);
    return { shortage: false };
  }
}
