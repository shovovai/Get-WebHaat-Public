import { NextRequest, NextResponse } from "next/server";
import { brand } from "@/config/brand";
import { confirmSslCommerzPayment, failSslCommerzPayment } from "@/lib/sslcommerz";

export const dynamic = "force-dynamic";

// SSLCommerz posts form data to these URLs:
//   success / fail / cancel — the customer's browser is redirected here
//   ipn                     — server-to-server Instant Payment Notification
// Payment is only trusted after re-validating val_id with SSLCommerz.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ result: string }> }
) {
  const { result } = await params;
  const form = await request.formData().catch(() => null);
  const valId = String(form?.get("val_id") || "");
  const orderId = String(form?.get("value_a") || "");

  let paid = false;
  let refundPending = false;
  let resolvedOrderId = orderId;
  if (valId && (result === "success" || result === "ipn")) {
    try {
      const r = await confirmSslCommerzPayment(valId);
      paid = r.paid;
      refundPending = Boolean(r.refundPending);
      resolvedOrderId = r.orderId || orderId;
    } catch (error) {
      console.error("SSLCommerz confirmation failed:", error);
    }
  } else if (result === "fail" || result === "cancel") {
    // Release the stock hold (only if tran_id matches the order's latest attempt)
    await failSslCommerzPayment(orderId, String(form?.get("tran_id") || "")).catch((error) =>
      console.error("SSLCommerz failure handling failed:", error)
    );
  }

  if (result === "ipn") {
    return NextResponse.json({ received: true, paid });
  }

  const orderPath = encodeURIComponent(resolvedOrderId);
  const target = paid
    ? `${brand.url}/success?order_id=${orderPath}&payment_method=sslcommerz`
    : resolvedOrderId && refundPending
      ? `${brand.url}/user/orders/${orderPath}?payment=refund_pending`
      : resolvedOrderId
      ? `${brand.url}/user/orders/${orderPath}?payment=${result === "cancel" ? "cancelled" : "failed"}`
      : `${brand.url}/user/orders`;

  return NextResponse.redirect(target, 303);
}
