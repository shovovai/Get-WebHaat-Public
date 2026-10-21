import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { backendClient } from "@/sanity/lib/backendClient";
import { markManualPaymentRejected, markOrderPaid } from "@/lib/orderPayment";
import { PAYMENT_STATUSES } from "@/lib/orderStatus";

export const dynamic = "force-dynamic";

const AWAITING = `*[_type == "order" && defined(manualPayment.transactionId) && paymentStatus == "awaiting_verification"]`;
const ALL = `*[_type == "order" && defined(manualPayment.transactionId)]`;
const PROJECTION = `| order(manualPayment.submittedAt desc)[0...200]{
  _id, orderNumber, customerName, email, totalPrice, currency, paymentStatus, status, orderDate, manualPayment
}`;

// GET ?status=awaiting|all — manual (send money) payments to review
export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const onlyAwaiting = request.nextUrl.searchParams.get("status") !== "all";
  const [payments, awaitingCount] = await Promise.all([
    backendClient.fetch(`${onlyAwaiting ? AWAITING : ALL} ${PROJECTION}`),
    backendClient.fetch<number>(`count(${AWAITING})`),
  ]);
  return NextResponse.json({ success: true, payments, awaitingCount });
}

// POST { orderId, action: "approve" | "reject", reason? }
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    const { orderId, action, reason } = await request.json();
    if (typeof orderId !== "string" || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const order = await backendClient.fetch<{ paymentStatus?: string } | null>(
      `*[_type == "order" && _id == $orderId && defined(manualPayment)][0]{ paymentStatus }`,
      { orderId }
    );
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.paymentStatus !== PAYMENT_STATUSES.AWAITING_VERIFICATION) {
      return NextResponse.json({ error: "This payment was already reviewed" }, { status: 409 });
    }

    if (action === "approve") {
      const result = await markOrderPaid(orderId, {
        set: {
          "manualPayment.verifiedBy": admin.email,
          "manualPayment.verifiedAt": new Date().toISOString(),
        },
      });
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    } else {
      const text = typeof reason === "string" ? reason.trim().slice(0, 300) : "";
      const result = await markManualPaymentRejected(orderId, text, admin.email);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Payment review failed:", error);
    return NextResponse.json({ error: "Could not update payment" }, { status: 500 });
  }
}
