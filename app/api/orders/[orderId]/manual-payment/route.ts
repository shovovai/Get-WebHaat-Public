import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { backendClient } from "@/sanity/lib/backendClient";
import { resolvePaymentOption } from "@/lib/paymentMethods";
import { validateManualSubmission } from "@/lib/manualPayment";
import { notifyAdminsOfManualPayment } from "@/lib/orderPayment";
import { PAYMENT_STATUSES } from "@/lib/orderStatus";
import { limitRequest } from "@/lib/rateLimit";

// POST /api/orders/:orderId/manual-payment  { accountId, senderNumber, transactionId }
// Customer submits (or re-submits after rejection) a send-money payment for review.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const limited = await limitRequest(request, "manual-pay", { limit: 10, windowMs: 10 * 60_000 });
  if (limited) return limited;

  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { orderId } = await params;
    const body = await request.json();

    const order = await backendClient.fetch<{
      _id: string;
      orderNumber: string;
      totalPrice: number;
      status?: string;
      paymentStatus?: string;
    } | null>(
      `*[_type == "order" && _id == $orderId && clerkUserId == $userId][0]{ _id, orderNumber, totalPrice, status, paymentStatus }`,
      { orderId, userId }
    );
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.paymentStatus === PAYMENT_STATUSES.PAID) {
      return NextResponse.json({ error: "This order is already paid" }, { status: 400 });
    }
    if (order.paymentStatus === PAYMENT_STATUSES.AWAITING_VERIFICATION) {
      return NextResponse.json({ error: "Your payment is already being verified" }, { status: 400 });
    }
    if (order.status === "cancelled") {
      return NextResponse.json({ error: "This order was cancelled" }, { status: 400 });
    }

    const option = await resolvePaymentOption(`manual:${String(body.accountId || "")}`);
    if (!option) {
      return NextResponse.json({ error: "This payment account is not available" }, { status: 400 });
    }

    const check = await validateManualSubmission(option.provider || "other", body, order._id);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

    await backendClient
      .patch(order._id)
      .set({
        paymentMethod: "manual",
        paymentStatus: PAYMENT_STATUSES.AWAITING_VERIFICATION,
        manualPayment: {
          accountId: option.id.replace("manual:", ""),
          provider: option.provider,
          accountLabel: option.label,
          accountNumber: option.accountNumber,
          senderNumber: check.senderNumber,
          transactionId: check.transactionId,
          submittedAt: new Date().toISOString(),
        },
      })
      .commit();

    await notifyAdminsOfManualPayment({
      orderNumber: order.orderNumber,
      totalPrice: order.totalPrice,
      provider: option.provider,
      senderNumber: check.senderNumber,
      transactionId: check.transactionId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Manual payment submission failed:", error);
    return NextResponse.json({ error: "Could not submit payment" }, { status: 500 });
  }
}
