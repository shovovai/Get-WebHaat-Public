import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { backendClient } from "@/sanity/lib/backendClient";
import { parseCouponInput, toPatch } from "@/lib/couponInput";

type Ctx = { params: Promise<{ id: string }> };

async function ensureCoupon(id: string) {
  return backendClient.fetch<number>(`count(*[_type == "coupon" && _id == $id])`, { id });
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;
    const { id } = await params;
    if (!(await ensureCoupon(id))) return NextResponse.json({ error: "Coupon not found" }, { status: 404 });

    const parsed = parseCouponInput(await request.json(), true);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    if (parsed.data.code) {
      const clash = await backendClient.fetch<number>(
        `count(*[_type == "coupon" && upper(code) == $code && _id != $id])`,
        { code: parsed.data.code, id }
      );
      if (clash) return NextResponse.json({ error: "Another coupon already uses this code" }, { status: 409 });
    }

    const { set, unset } = toPatch(parsed.data);
    let patch = backendClient.patch(id).set(set);
    if (unset.length) patch = patch.unset(unset);
    const coupon = await patch.commit();
    return NextResponse.json({ success: true, coupon });
  } catch (error) {
    console.error("Update coupon failed:", error);
    return NextResponse.json({ error: "Failed to update coupon" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;
    const { id } = await params;
    if (!(await ensureCoupon(id))) return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    await backendClient.delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete coupon failed:", error);
    return NextResponse.json({ error: "Failed to delete coupon" }, { status: 500 });
  }
}
