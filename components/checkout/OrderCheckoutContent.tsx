"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, Loader2, MapPin, Package } from "lucide-react";
import { toast } from "sonner";
import { image } from "@/sanity/image";
import { formatPrice } from "@/lib/storeConfig";
import type { PaymentOption } from "@/lib/paymentConfig";
import PaymentOptionPicker, { type ManualInput } from "@/components/checkout/PaymentOptionPicker";

interface OrderProduct {
  product: {
    _id: string;
    name: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    images?: any[];
    price: number;
  };
  quantity: number;
}

interface Order {
  _id: string;
  orderNumber: string;
  products: OrderProduct[];
  subtotal: number;
  amountDiscount?: number;
  couponCode?: string;
  tax: number;
  shipping: number;
  totalPrice: number;
  address: { name: string; address: string; city: string; state: string; zip: string };
  status: string;
  paymentStatus: string;
}

// Pay later for an order that was saved but not paid yet
export function OrderCheckoutContent({
  order,
  paymentOptions,
}: {
  order: Order;
  paymentOptions: PaymentOption[];
}) {
  const [optionId, setOptionId] = useState(paymentOptions[0]?.id || "");
  const [manual, setManual] = useState<ManualInput>({ senderNumber: "", transactionId: "" });
  const [busy, setBusy] = useState(false);
  const paid = order.paymentStatus === "paid";
  const awaiting = order.paymentStatus === "awaiting_verification";
  const selected = paymentOptions.find((o) => o.id === optionId);

  const pay = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      if (selected.kind === "manual") {
        const res = await fetch(`/api/orders/${order._id}/manual-payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId: selected.id.replace("manual:", ""), ...manual }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not submit payment");
        window.location.href = `/success?order_id=${order._id}&payment_method=manual`;
        return;
      }
      const res = await fetch(`/api/checkout/${selected.method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order._id }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Could not start payment");
      window.location.href = data.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start payment");
      setBusy(false);
    }
  };

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_420px]">
      <section className="rounded-lg bg-white p-6 lg:self-start">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-2xl text-ink">
            <Package className="h-5 w-5 text-clay" /> Order {order.orderNumber}
          </h2>
          <span className="rounded-full bg-sand px-3 py-1 text-xs font-semibold capitalize text-ink">
            {order.status.replace(/_/g, " ")}
          </span>
        </div>
        <ul className="divide-y divide-border">
          {order.products?.map((item, i) => (
            <li key={i} className="flex items-center gap-4 py-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-sand">
                {item.product?.images?.[0] && (
                  <img
                    src={image(item.product.images[0]).size(160, 160).url()}
                    alt=""
                    className="h-full w-full object-contain p-1.5 mix-blend-multiply"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 font-medium text-ink">{item.product?.name}</p>
                <p className="text-sm text-light-color">Qty {item.quantity}</p>
              </div>
              <p className="font-semibold tabular-nums">
                {formatPrice((item.product?.price || 0) * item.quantity)}
              </p>
            </li>
          ))}
        </ul>
        {order.address && (
          <p className="mt-5 flex gap-2 rounded-2xl bg-cream p-4 text-sm text-light-color">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-clay" />
            {[order.address.name, order.address.address, order.address.city, order.address.state, order.address.zip]
              .filter(Boolean)
              .join(", ")}
          </p>
        )}
      </section>

      <aside className="rounded-lg bg-white p-6">
        <h2 className="mb-4 font-display text-2xl text-ink">Payment</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
          {!!order.amountDiscount && (
            <div className="flex justify-between text-sage">
              <span>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</span>
              <span>-{formatPrice(order.amountDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between text-light-color"><span>Delivery charge</span><span>{order.shipping ? formatPrice(order.shipping) : "Free"}</span></div>
          {!!order.tax && <div className="flex justify-between text-light-color"><span>Tax</span><span>{formatPrice(order.tax)}</span></div>}
          <div className="flex items-end justify-between border-t border-dashed border-border pt-3">
            <span className="font-semibold">Total</span>
            <span className="font-display text-3xl">{formatPrice(order.totalPrice)}</span>
          </div>
        </div>

        {paid ? (
          <p className="mt-6 rounded-2xl bg-sage/10 p-4 text-sm font-semibold text-sage">This order is already paid.</p>
        ) : awaiting ? (
          <p className="mt-6 flex gap-2 rounded-2xl bg-marigold/15 p-4 text-sm text-ink">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-clay" />
            We&apos;re verifying your payment. You&apos;ll get a notification once it&apos;s confirmed.
          </p>
        ) : paymentOptions.length === 0 ? (
          <p className="mt-6 rounded-2xl bg-sand p-4 text-sm text-light-color">
            Online payment isn&apos;t available right now. You can pay cash on delivery.
          </p>
        ) : (
          <>
            <div className="mt-6">
              <PaymentOptionPicker
                options={paymentOptions}
                selectedId={optionId}
                onSelect={setOptionId}
                amount={order.totalPrice}
                manual={manual}
                onManualChange={setManual}
              />
            </div>
            <button
              onClick={pay}
              disabled={busy || !selected}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-ink text-sm font-medium text-white hover:bg-black disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {selected?.kind === "manual" ? "Submit payment details" : `Pay ${formatPrice(order.totalPrice)}`}
            </button>
          </>
        )}
        <Link href={`/user/orders/${order._id}`} className="mt-4 block text-center text-sm text-light-color hover:text-ink">
          View order details
        </Link>
      </aside>
    </div>
  );
}
