import { NextRequest, NextResponse } from "next/server";
import { brand } from "@/config/brand";
import { completeBkashPayment } from "@/lib/bkash";

export const dynamic = "force-dynamic";

// bKash redirects the customer here: ?paymentID=...&status=success|failure|cancel
export async function GET(request: NextRequest) {
  const paymentID = request.nextUrl.searchParams.get("paymentID") || "";
  const status = request.nextUrl.searchParams.get("status") || "";

  let result: { orderId?: string; paid: boolean; refundPending?: boolean } = { paid: false };
  if (paymentID) {
    try {
      result = await completeBkashPayment(paymentID, status);
    } catch (error) {
      console.error("bKash callback failed:", error);
    }
  }

  const target = result.paid
    ? `${brand.url}/success?order_id=${result.orderId}&payment_method=bkash`
    : result.orderId && result.refundPending
      ? `${brand.url}/user/orders/${result.orderId}?payment=refund_pending`
      : result.orderId
      ? `${brand.url}/user/orders/${result.orderId}?payment=${status === "cancel" ? "cancelled" : "failed"}`
      : `${brand.url}/user/orders`;
  return NextResponse.redirect(target, 303);
}
