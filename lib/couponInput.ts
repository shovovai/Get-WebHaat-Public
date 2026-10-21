import "server-only";

export interface CouponInput {
  code: string;
  description?: string;
  discountType: "percent" | "fixed";
  value: number;
  minOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  usageLimit?: number | null;
  oncePerCustomer?: boolean;
  active?: boolean;
}

const optNum = (v: unknown) =>
  v === null || v === undefined || v === "" ? null : Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : NaN;
const optDate = (v: unknown) =>
  !v ? null : Number.isNaN(new Date(String(v)).getTime()) ? "invalid" : new Date(String(v)).toISOString();

/** Validates admin coupon input. Returns clean data or an error message. */
export function parseCouponInput(body: Record<string, unknown>, partial = false):
  | { ok: true; data: Partial<CouponInput> }
  | { ok: false; error: string } {
  const data: Partial<CouponInput> = {};

  if (!partial || "code" in body) {
    const code = String(body.code || "").trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
      return { ok: false, error: "Code must be 3–32 letters, numbers, - or _" };
    }
    data.code = code;
  }
  if (!partial || "discountType" in body) {
    if (body.discountType !== "percent" && body.discountType !== "fixed") {
      return { ok: false, error: "Discount type must be percent or fixed" };
    }
    data.discountType = body.discountType;
  }
  if (!partial || "value" in body) {
    const value = Number(body.value);
    if (!(value > 0)) return { ok: false, error: "Value must be greater than 0" };
    if ((data.discountType ?? body.discountType) === "percent" && value > 100) {
      return { ok: false, error: "Percentage cannot exceed 100" };
    }
    data.value = value;
  }
  for (const key of ["minOrderAmount", "maxDiscountAmount", "usageLimit"] as const) {
    if (key in body) {
      const n = optNum(body[key]);
      if (Number.isNaN(n)) return { ok: false, error: `${key} must be a positive number` };
      data[key] = n;
    }
  }
  for (const key of ["startsAt", "expiresAt"] as const) {
    if (key in body) {
      const d = optDate(body[key]);
      if (d === "invalid") return { ok: false, error: `${key} is not a valid date` };
      data[key] = d;
    }
  }
  if ("description" in body) data.description = String(body.description || "").slice(0, 200);
  if ("oncePerCustomer" in body) data.oncePerCustomer = Boolean(body.oncePerCustomer);
  if ("active" in body) data.active = Boolean(body.active);
  return { ok: true, data };
}

/** Splits into fields to set and fields to unset (null → unset) */
export function toPatch(data: Partial<CouponInput>) {
  const set: Record<string, unknown> = {};
  const unset: string[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (v === null) unset.push(k);
    else if (v !== undefined) set[k] = v;
  }
  return { set, unset };
}
