import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import crypto from "crypto";
import { getMyOrders } from "@/sanity/helpers";
import { backendClient } from "@/sanity/lib/backendClient";
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
} from "@/lib/orderStatus";
import { sendOrderStatusNotification } from "@/lib/notificationService";
import {
  PricingError,
  lockCouponForOrder,
  normalizeCartInput,
  priceCart,
  verifiedEmailOf,
} from "@/lib/pricing";
import { OutOfStockError, createOrderWithStock, releaseExpiredReservations } from "@/lib/stock";
import {
  ConflictRetryExhausted,
  MAX_OPEN_COD_ORDERS,
  MAX_OPEN_UNPAID_ONLINE_ORDERS,
  isGatewayMethod,
  reservationDeadline,
} from "@/lib/orderGuards";
import { privateId } from "@/lib/privateId";
import { sendAdminNewOrderEmail, sendCustomerOrderEmail } from "@/lib/orderEmails";
import { resolvePaymentOption } from "@/lib/paymentMethods";
import { getPaymentConfig } from "@/lib/paymentConfig";
import { validateManualSubmission } from "@/lib/manualPayment";
import { notifyAdminsOfManualPayment } from "@/lib/orderPayment";
import { rateLimit } from "@/lib/rateLimit";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orders = await getMyOrders(userId);

    return NextResponse.json(orders || []);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const str = (v: unknown, max = 200) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

// POST /api/orders
// Body: { items: [{ productId, quantity }], shippingAddress, paymentOptionId, couponCode?,
//         manualPayment?: { senderNumber, transactionId } }
// All amounts are calculated on the server — client-sent totals are ignored.
export const POST = async (request: NextRequest) => {
  const limited = rateLimit(request, "orders", { limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const items = normalizeCartInput(body.items);
    // "paymentOptionId" e.g. "bkash" or "manual:ab12"; older clients send "paymentMethod"
    const optionId: string = body.paymentOptionId || body.paymentMethod || "";
    const addr = body.shippingAddress || {};

    if (items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    const shippingAddress = {
      name: str(addr.name, 100),
      address: str(addr.address, 300),
      city: str(addr.city, 100),
      state: str(addr.state, 100),
      zip: str(addr.zip, 20),
      phone: str(addr.phone, 30),
    };
    if (!shippingAddress.address || !shippingAddress.city) {
      return NextResponse.json(
        { error: "Shipping address is required" },
        { status: 400 }
      );
    }

    const option = await resolvePaymentOption(optionId);
    if (!option) {
      return NextResponse.json(
        { error: "This payment method is not available" },
        { status: 400 }
      );
    }
    const paymentMethod = option.method;

    // Discounts and once-per-customer coupon checks only trust a Clerk-verified email
    const verifiedEmail = verifiedEmailOf(user);
    const userEmail =
      verifiedEmail || user.primaryEmailAddress?.emailAddress || user.emailAddresses[0]?.emailAddress || "";
    const userName =
      `${user.firstName || ""} ${user.lastName || ""}`.trim() || shippingAddress.name || "Customer";

    // Give back stock held by unpaid online orders whose time ran out (also done by the daily cron)
    await releaseExpiredReservations(20).catch((e) => console.error("Releasing expired reservations failed:", e));

    // Limit how many unpaid orders one customer can hold, so nobody can lock up inventory
    const isCod = paymentMethod === PAYMENT_METHODS.CASH_ON_DELIVERY;
    const openOrders = await backendClient.fetch<number>(
      isCod
        ? `count(*[_type == "order" && clerkUserId == $userId && paymentMethod == "cash_on_delivery" && status == "pending"])`
        : `count(*[_type == "order" && clerkUserId == $userId && paymentMethod != "cash_on_delivery"
             && status != "cancelled" && !(paymentStatus in ["paid", "refunded"])
             && stockReserved == true && stockRestored != true])`,
      { userId }
    );
    const openLimit = isCod ? MAX_OPEN_COD_ORDERS : MAX_OPEN_UNPAID_ONLINE_ORDERS;
    if (openOrders >= openLimit) {
      return NextResponse.json(
        {
          error: isCod
            ? `You already have ${openOrders} cash on delivery orders waiting for confirmation. Please wait until we confirm them.`
            : `You already have ${openOrders} unpaid orders. Please pay or cancel them before placing a new one.`,
        },
        { status: 429 }
      );
    }

    const pricing = await priceCart(items, {
      couponCode: body.couponCode,
      clerkUserId: userId,
      email: verifiedEmail,
      strictCoupon: Boolean(body.couponCode),
    });

    // COD may be limited to orders under a maximum amount
    if (paymentMethod === PAYMENT_METHODS.CASH_ON_DELIVERY) {
      const { cod } = await getPaymentConfig();
      if (cod.maxOrderAmount && pricing.total > cod.maxOrderAmount) {
        return NextResponse.json(
          { error: "Cash on delivery isn't available for this order amount. Please choose another payment method." },
          { status: 400 }
        );
      }
    }

    // Manual (send money) payments: customer provides sender number + TrxID
    let manualPayment: Record<string, unknown> | undefined;
    if (paymentMethod === PAYMENT_METHODS.MANUAL) {
      const check = await validateManualSubmission(option.provider || "other", body.manualPayment || {});
      if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
      manualPayment = {
        accountId: option.id.replace("manual:", ""),
        provider: option.provider,
        accountLabel: option.label,
        accountNumber: option.accountNumber,
        senderNumber: check.senderNumber,
        transactionId: check.transactionId,
        submittedAt: new Date().toISOString(),
      };
    }

    const orderNumber = `WH-${Date.now().toString(36).toUpperCase()}-${crypto
      .randomBytes(2)
      .toString("hex")
      .toUpperCase()}`;

    const orderDoc = {
      _id: privateId("order"),
      _type: "order" as const,
      orderNumber,
      customerName: userName,
      email: userEmail,
      emailVerified: Boolean(verifiedEmail),
      phone: user.phoneNumbers?.[0]?.phoneNumber || shippingAddress.phone,
      clerkUserId: userId,
      products: pricing.lines.map((line) => ({
        _key: crypto.randomUUID(),
        product: { _type: "reference", _ref: line.productId },
        quantity: line.quantity,
      })),
      subtotal: pricing.subtotal,
      amountDiscount: pricing.discountTotal,
      businessDiscount: pricing.businessDiscount,
      couponCode: pricing.coupon?.code,
      couponDiscount: pricing.coupon?.amount || 0,
      shipping: pricing.shipping,
      tax: pricing.tax,
      totalPrice: pricing.total,
      currency: pricing.currency,
      address: {
        _type: "object",
        name: shippingAddress.name || userName,
        address: shippingAddress.address,
        city: shippingAddress.city,
        state: shippingAddress.state,
        zip: shippingAddress.zip,
      },
      status: ORDER_STATUSES.PENDING,
      orderDate: new Date().toISOString(),
      paymentMethod,
      paymentStatus: manualPayment
        ? PAYMENT_STATUSES.AWAITING_VERIFICATION
        : PAYMENT_STATUSES.PENDING,
      ...(manualPayment && { manualPayment }),
      ...(paymentMethod === PAYMENT_METHODS.CASH_ON_DELIVERY && {
        stripePaymentIntentId: `cod_${orderNumber}`,
      }),
      // Unpaid card / bKash / Nagad / SSLCommerz orders hold stock for a limited time only
      ...(isGatewayMethod(paymentMethod) && { reservedUntil: reservationDeadline() }),
    };

    // One atomic transaction: create the order, take the stock (only if still available)
    // and count the coupon use (only if still allowed). Retries on concurrent changes.
    const coupon = pricing.coupon;
    const createdOrder = { _id: orderDoc._id, status: orderDoc.status };
    await createOrderWithStock(
      orderDoc,
      pricing.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      coupon
        ? async (tx) => {
            const locked = await lockCouponForOrder(coupon._id, { clerkUserId: userId, email: verifiedEmail });
            tx.patch(locked._id, (p) =>
              p.ifRevisionId(locked._rev).setIfMissing({ usedCount: 0 }).inc({ usedCount: 1 })
            );
          }
        : undefined
    );

    // Side effects: notifications, emails

    const emailInput = {
      orderId: createdOrder._id,
      orderNumber,
      customerName: userName,
      customerEmail: userEmail,
      paymentMethod,
      pricing,
      address: shippingAddress,
    };
    await Promise.all([
      sendCustomerOrderEmail(emailInput),
      sendAdminNewOrderEmail(emailInput),
      manualPayment
        ? notifyAdminsOfManualPayment({
            orderNumber,
            totalPrice: pricing.total,
            provider: String(manualPayment.provider || ""),
            senderNumber: String(manualPayment.senderNumber),
            transactionId: String(manualPayment.transactionId),
          })
        : Promise.resolve(),
      sendOrderStatusNotification({
        clerkUserId: userId,
        orderNumber,
        orderId: createdOrder._id,
        status: ORDER_STATUSES.PENDING,
      }).catch((e) => console.error("Order notification failed:", e)),
    ]);

    return NextResponse.json({
      success: true,
      order: {
        _id: createdOrder._id,
        orderNumber,
        status: createdOrder.status,
        paymentMethod,
        totalPrice: pricing.total,
        currency: pricing.currency,
      },
      message: "Order created successfully",
    });
  } catch (error: unknown) {
    if (error instanceof PricingError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof OutOfStockError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof ConflictRetryExhausted) {
      return NextResponse.json(
        { error: "We're very busy right now. Please try placing your order again." },
        { status: 503 }
      );
    }
    console.error("Order creation error:", error);
    return NextResponse.json(
      { error: "Failed to create order. Please try again." },
      { status: 500 }
    );
  }
};
