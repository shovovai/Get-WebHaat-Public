import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { backendClient } from "@/sanity/lib/backendClient";
import { privateId } from "@/lib/privateId";
import { parseCouponInput, toPatch } from "@/lib/couponInput";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const coupons = await backendClient.fetch(
    `*[_type == "coupon"] | order(_createdAt desc){
      _id, code, description, discountType, value, minOrderAmount, maxDiscountAmount,
      startsAt, expiresAt, usageLimit, usedCount, oncePerCustomer, active, _createdAt
    }`
  );
  return NextResponse.json({ success: true, coupons });
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    const parsed = parseCouponInput(await request.json());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const exists = await backendClient.fetch<number>(
      `count(*[_type == "coupon" && upper(code) == $code])`,
      { code: parsed.data.code }
    );
    if (exists) return NextResponse.json({ error: "A coupon with this code already exists" }, { status: 409 });

    const { set } = toPatch(parsed.data);
    const coupon = await backendClient.create({
      _id: privateId("coupon"),
      _type: "coupon",
      active: true,
      oncePerCustomer: false,
      ...set,
      usedCount: 0,
    });
    return NextResponse.json({ success: true, coupon });
  } catch (error) {
    console.error("Create coupon failed:", error);
    return NextResponse.json({ error: "Failed to create coupon" }, { status: 500 });
  }
}
