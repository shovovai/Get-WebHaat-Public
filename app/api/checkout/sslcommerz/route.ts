import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { CheckoutError, loadPayableOrder, prepareOrderForGateway } from "@/lib/stripeCheckout";
import { createSslCommerzSession } from "@/lib/sslcommerz";
import { rateLimit } from "@/lib/rateLimit";

// POST /api/checkout/sslcommerz  { orderId }  → { url } of the SSLCommerz gateway
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "pay-ssl", { limit: 20, windowMs: 10 * 60_000 });
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
    await prepareOrderForGateway(order, "sslcommerz");
    const url = await createSslCommerzSession(order);
    return NextResponse.json({ success: true, url });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("SSLCommerz checkout error:", error);
    return NextResponse.json({ error: "Failed to start payment" }, { status: 500 });
  }
}
