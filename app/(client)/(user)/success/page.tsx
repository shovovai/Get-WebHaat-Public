import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Check, Clock, Package, ShoppingBag } from "lucide-react";
import Container from "@/components/Container";
import { backendClient } from "@/sanity/lib/backendClient";
import { formatPrice } from "@/lib/storeConfig";

export const metadata: Metadata = { title: "Order confirmed", robots: { index: false } };
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ order_id?: string; orderId?: string; payment_method?: string }>;
}

const PAYMENT_LABEL: Record<string, string> = {
  cash_on_delivery: "Cash on delivery",
  stripe: "Card",
  sslcommerz: "bKash / Nagad / card",
  bkash: "bKash",
  nagad: "Nagad",
  manual: "Manual transfer",
};

export default async function SuccessPage({ searchParams }: Props) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const params = await searchParams;
  const orderId = params.order_id || params.orderId;

  const order = orderId
    ? await backendClient.fetch<{
        _id: string;
        orderNumber: string;
        totalPrice: number;
        paymentMethod: string;
        paymentStatus: string;
        orderDate: string;
        itemCount: number;
        email?: string;
      } | null>(
        `*[_type == "order" && _id == $orderId && clerkUserId == $userId][0]{
          _id, orderNumber, totalPrice, paymentMethod, paymentStatus, orderDate, email,
          "itemCount": math::sum(products[].quantity)
        }`,
        { orderId, userId }
      )
    : null;

  const paid = order?.paymentStatus === "paid";
  const verifying = order?.paymentStatus === "awaiting_verification";
  const awaitingOnlinePayment =
    order && !paid && order.paymentMethod !== "cash_on_delivery";

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-xl text-center">
        <div
          className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${
            awaitingOnlinePayment ? "bg-marigold/20 text-clay" : "bg-sage text-white"
          }`}
        >
          {awaitingOnlinePayment ? <Clock className="h-9 w-9" /> : <Check className="h-10 w-10" strokeWidth={2.5} />}
        </div>
        <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-light-color">
          {awaitingOnlinePayment ? "Payment processing" : "Thank you"}
        </p>
        <h1 className="mt-2 text-[34px] leading-tight text-ink sm:text-[44px] sm:text-5xl">
          {verifying
            ? "Order placed — verifying your payment"
            : awaitingOnlinePayment
              ? "We're confirming your payment"
              : "Your order is confirmed"}
        </h1>
        <p className="mt-4 text-light-color">
          {verifying
            ? "Thanks! Our team will check your transaction ID and confirm the payment shortly. You'll get a notification and an email as soon as it's verified."
            : awaitingOnlinePayment
            ? "This usually takes a few seconds. Your order is saved — you'll see it marked as paid in your orders shortly."
            : `We've received your order${order?.email ? ` and sent a confirmation to ${order.email}` : ""}. We'll let you know when it's on its way.`}
        </p>

        {order && (
          <div className="mt-10 rounded-lg bg-white p-6 text-left">
            <div className="flex items-center justify-between border-b border-dashed border-border pb-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-light-color">Order</p>
                <p className="font-semibold text-ink">{order.orderNumber}</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  paid ? "bg-sage/15 text-sage" : "bg-sand text-ink"
                }`}
              >
                {paid
                  ? "Paid"
                  : verifying
                    ? "Verifying payment"
                    : order.paymentMethod === "cash_on_delivery"
                      ? "Pay on delivery"
                      : "Awaiting payment"}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-4 pt-4 text-sm">
              <div>
                <dt className="text-light-color">Items</dt>
                <dd className="font-medium text-ink">{order.itemCount}</dd>
              </div>
              <div>
                <dt className="text-light-color">Total</dt>
                <dd className="font-display text-xl text-ink">{formatPrice(order.totalPrice)}</dd>
              </div>
              <div>
                <dt className="text-light-color">Payment</dt>
                <dd className="font-medium text-ink">{PAYMENT_LABEL[order.paymentMethod] || order.paymentMethod}</dd>
              </div>
              <div>
                <dt className="text-light-color">Placed</dt>
                <dd className="font-medium text-ink">
                  {new Date(order.orderDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </dd>
              </div>
            </dl>
          </div>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href={order ? `/user/orders/${order._id}` : "/user/orders"}
            className="inline-flex items-center gap-2 rounded-md bg-ink px-6 py-3 text-sm font-medium text-white hover:bg-clay"
          >
            <Package className="h-4 w-4" /> Track order
          </Link>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 rounded-md border border-ink px-6 py-3 text-sm font-medium text-ink hover:border-ink"
          >
            <ShoppingBag className="h-4 w-4" /> Keep shopping
          </Link>
        </div>
      </div>
    </Container>
  );
}
