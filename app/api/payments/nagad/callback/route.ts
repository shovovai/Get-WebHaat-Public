import { NextRequest, NextResponse } from "next/server";
import { brand } from "@/config/brand";
import { verifyNagadPayment } from "@/lib/nagad";

export const dynamic = "force-dynamic";

// Nagad redirects the customer here with ?payment_ref_id=...&status=...
// The payment is always re-verified with Nagad before the order is marked paid.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const refId = params.get("payment_ref_id") || "";
  const status = params.get("status") || "";
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "127.0.0.1";

  let result: { orderId?: string; paid: boolean; refundPending?: boolean } = { paid: false };
  if (refId) {
    try {
      result = await verifyNagadPayment(refId, ip);
    } catch (error) {
      console.error("Nagad callback failed:", error);
    }
  }

  const target = result.paid
    ? `${brand.url}/success?order_id=${result.orderId}&payment_method=nagad`
    : result.orderId && result.refundPending
      ? `${brand.url}/user/orders/${result.orderId}?payment=refund_pending`
      : result.orderId
      ? `${brand.url}/user/orders/${result.orderId}?payment=${status === "Aborted" ? "cancelled" : "failed"}`
      : `${brand.url}/user/orders`;
  return NextResponse.redirect(target, 303);
}
