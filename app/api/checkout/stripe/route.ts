import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  CheckoutError,
  createStripeSessionForOrder,
  loadPayableOrder,
  prepareOrderForGateway,
} from "@/lib/stripeCheckout";
import { rateLimit } from "@/lib/rateLimit";

// POST /api/checkout/stripe  { orderId }
// Starts a Stripe Checkout session for an existing order owned by the caller.
export const POST = async (request: NextRequest) => {
  const limited = rateLimit(request, "pay-stripe", { limit: 20, windowMs: 10 * 60_000 });
  if (limited) return limited;

  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await request.json();
    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    const order = await loadPayableOrder(orderId, userId);
    await prepareOrderForGateway(order, "stripe");
    const url = await createStripeSessionForOrder(order);
    return NextResponse.json({ success: true, url, checkoutUrl: url });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to start card payment" },
      { status: 500 }
    );
  }
};
