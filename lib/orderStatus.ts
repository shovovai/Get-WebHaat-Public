// Order status constants
export const ORDER_STATUSES = {
  PENDING: "pending",
  PROCESSING: "processing",
  PAID: "paid",
  SHIPPED: "shipped",
  OUT_FOR_DELIVERY: "out_for_delivery",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
} as const;

// Payment status constants
export const PAYMENT_STATUSES = {
  PENDING: "pending",
  AWAITING_VERIFICATION: "awaiting_verification",
  PAID: "paid",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;

// Payment methods
export const PAYMENT_METHODS = {
  CASH_ON_DELIVERY: "cash_on_delivery",
  STRIPE: "stripe",
  SSLCOMMERZ: "sslcommerz",
  BKASH: "bkash",
  NAGAD: "nagad",
  MANUAL: "manual",
  /** @deprecated legacy simulated gateway — no longer accepted for new orders */
  CLERK: "clerk",
  CARD: "card",
} as const;

export type OrderStatus = (typeof ORDER_STATUSES)[keyof typeof ORDER_STATUSES];
export type PaymentStatus =
  (typeof PAYMENT_STATUSES)[keyof typeof PAYMENT_STATUSES];
export type PaymentMethod =
  (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS];
