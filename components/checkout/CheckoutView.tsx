"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Check, Loader2, MapPin, Plus } from "lucide-react";
import { toast } from "sonner";
import useCartStore from "@/store";
import { image } from "@/sanity/image";
import { formatPrice } from "@/lib/storeConfig";
import { cn } from "@/lib/utils";
import { AddAddressSidebar } from "@/components/cart/AddAddressSidebar";
import EmptyCart from "@/components/EmptyCart";
import OrderSummary from "@/components/checkout/OrderSummary";
import { useCheckoutQuote, useCouponCode } from "@/hooks/useCheckoutQuote";
import PaymentOptionPicker, { type ManualInput } from "@/components/checkout/PaymentOptionPicker";

interface Address {
  _id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone?: string;
  default?: boolean;
}

const Step = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
  <section className="rounded-lg bg-white p-5 sm:p-6">
    <h2 className="mb-5 flex items-center gap-3 font-display text-xl text-ink">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink font-sans text-sm font-semibold text-cream">
        {n}
      </span>
      {title}
    </h2>
    {children}
  </section>
);

export default function CheckoutView() {
  const { user, isLoaded } = useUser();
  const [mounted, setMounted] = useState(false);
  const [couponCode, setCouponCode] = useCouponCode();
  const [optionId, setOptionId] = useState<string>("");
  const [manual, setManual] = useState<ManualInput>({ senderNumber: "", transactionId: "" });
  const { items, pricing, paymentOptions, error, loading } = useCheckoutQuote(couponCode, optionId);
  const resetCart = useCartStore((s) => s.resetCart);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [placing, setPlacing] = useState(false);

  useEffect(() => setMounted(true), []);

  const loadAddresses = useCallback(async () => {
    try {
      const res = await fetch("/api/user/addresses", { cache: "no-store" });
      const data = await res.json();
      const list: Address[] = data.addresses || [];
      setAddresses(list);
      setSelectedAddressId((current) =>
        current && list.some((a) => a._id === current)
          ? current
          : (list.find((a) => a.default) || list[0])?._id ?? null
      );
    } catch {
      toast.error("Could not load your addresses");
    } finally {
      setAddressesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && user) loadAddresses();
  }, [isLoaded, user, loadAddresses]);

  // Keep the chosen payment option valid when the available list arrives
  useEffect(() => {
    if (paymentOptions.length && !paymentOptions.some((o) => o.id === optionId)) {
      setOptionId(paymentOptions[0].id);
    }
  }, [paymentOptions, optionId]);

  const selectedOption = paymentOptions.find((o) => o.id === optionId);
  const method = selectedOption?.method || "";

  const selectedAddress = addresses.find((a) => a._id === selectedAddressId) || null;

  const placeOrder = async () => {
    if (!selectedAddress) {
      toast.error("Please choose a delivery address");
      return;
    }
    if (!selectedOption) {
      toast.error("Please choose a payment method");
      return;
    }
    if (selectedOption.kind === "manual" && (!manual.senderNumber.trim() || !manual.transactionId.trim())) {
      toast.error("Enter your number and the transaction ID after sending the money");
      return;
    }
    setPlacing(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.product._id, quantity: i.quantity })),
          shippingAddress: selectedAddress,
          paymentOptionId: selectedOption.id,
          couponCode: pricing?.coupon?.code,
          ...(selectedOption.kind === "manual" && { manualPayment: manual }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not place your order");

      const { _id: orderId, orderNumber } = data.order;
      let redirect = `/success?order_id=${orderId}&orderNumber=${encodeURIComponent(orderNumber)}&payment_method=${method}`;

      if (selectedOption.kind === "gateway") {
        const payRes = await fetch(`/api/checkout/${method}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
        const pay = await payRes.json();
        if (payRes.ok && pay.url) {
          redirect = pay.url;
        } else {
          toast.error("Order saved, but the payment page could not open. You can pay from your orders.");
          redirect = `/user/orders/${orderId}`;
        }
      }

      resetCart();
      setCouponCode("");
      window.location.href = redirect;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not place your order");
      setPlacing(false);
    }
  };

  if (!mounted || !isLoaded) {
    return <div className="h-96 animate-pulse rounded-3xl bg-sand" />;
  }
  if (items.length === 0 && !placing) return <EmptyCart />;

  return (
    <div className="grid items-start gap-8 pb-20 lg:grid-cols-[1fr_400px] lg:pb-0">
      <div className="space-y-6">
        <Step n={1} title="Delivery address">
          {addressesLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {[0, 1].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-sand" />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {addresses.map((a) => {
                const active = a._id === selectedAddressId;
                return (
                  <button
                    key={a._id}
                    type="button"
                    onClick={() => setSelectedAddressId(a._id)}
                    className={cn(
                      "relative rounded-2xl border-2 p-4 text-left transition-colors",
                      active ? "border-clay bg-clay/5" : "border-border hover:border-ink/30"
                    )}
                  >
                    {active && (
                      <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-clay text-white">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    )}
                    <p className="flex items-center gap-2 font-semibold text-ink">
                      <MapPin className="h-4 w-4 text-clay" /> {a.name}
                      {a.default && (
                        <span className="rounded-full bg-sand px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-light-color">
                          Default
                        </span>
                      )}
                    </p>
                    <p className="mt-2 pr-6 text-sm leading-relaxed text-light-color">
                      {a.address}
                      <br />
                      {[a.city, a.state, a.zip].filter(Boolean).join(", ")}
                    </p>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border p-4 text-sm font-semibold text-light-color transition-colors hover:border-clay hover:text-clay"
              >
                <Plus className="h-5 w-5" />
                Add a new address
              </button>
            </div>
          )}
        </Step>

        <Step n={2} title="Payment method">
          {!pricing && paymentOptions.length === 0 ? (
            <div className="h-24 animate-pulse rounded-2xl bg-sand" />
          ) : (
            <PaymentOptionPicker
              options={paymentOptions}
              selectedId={optionId}
              onSelect={setOptionId}
              amount={pricing?.total}
              manual={manual}
              onManualChange={setManual}
            />
          )}
        </Step>

        <Step n={3} title="Review items">
          <ul className="divide-y divide-border">
            {items.map(({ product, quantity }) => (
              <li key={product._id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-sand">
                  {product.images?.[0] && (
                    <img
                      src={image(product.images[0]).size(160, 160).url()}
                      alt=""
                      className="h-full w-full object-contain p-1.5 mix-blend-multiply"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 font-medium text-ink">{product.name}</p>
                  <p className="text-sm text-light-color">Qty {quantity}</p>
                </div>
                <p className="font-semibold tabular-nums text-ink">
                  {formatPrice((product.price || 0) * quantity)}
                </p>
              </li>
            ))}
          </ul>
          <Link href="/cart" className="mt-4 inline-block text-sm font-semibold text-clay hover:underline">
            Edit cart
          </Link>
        </Step>
      </div>

      <OrderSummary
        pricing={pricing}
        loading={loading}
        error={error}
        couponCode={couponCode}
        onCouponChange={setCouponCode}
        className="lg:sticky lg:top-40"
      >
        <button
          onClick={placeOrder}
          disabled={placing || !pricing || !!error || !selectedAddress || !selectedOption}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-ink text-sm font-medium text-white transition-colors hover:bg-clay-dark disabled:opacity-50"
        >
          {placing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Placing order…
            </>
          ) : selectedOption?.kind !== "gateway" ? (
            <>
              {selectedOption?.kind === "manual" ? "Submit payment & order" : "Place order"}
              {pricing ? ` · ${formatPrice(pricing.total)}` : ""}
            </>
          ) : (
            <>Continue to payment{pricing ? ` · ${formatPrice(pricing.total)}` : ""}</>
          )}
        </button>
        {!selectedAddress && !addressesLoading && (
          <p className="mt-2 text-center text-xs text-light-color">Add a delivery address to continue</p>
        )}
      </OrderSummary>

      {/* Phones: sticky total + action above the bottom nav */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 lg:hidden">
        <div className="flex items-center gap-3 border-t border-black/[0.08] bg-white px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-light-color">Total</p>
            <p className="font-display text-lg leading-tight text-ink">{pricing ? formatPrice(pricing.total) : "…"}</p>
          </div>
          <button
            onClick={placeOrder}
            disabled={placing || !pricing || !!error || !selectedAddress || !selectedOption}
            className="flex h-11 items-center gap-2 rounded-md bg-ink px-6 text-sm font-medium text-white disabled:opacity-50"
          >
            {placing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {selectedOption?.kind === "gateway" ? "Pay now" : "Place order"}
          </button>
        </div>
      </div>
      {user?.primaryEmailAddress?.emailAddress && (
        <AddAddressSidebar
          userEmail={user.primaryEmailAddress.emailAddress}
          isOpen={addOpen}
          onClose={() => setAddOpen(false)}
          onAddressAdded={loadAddresses}
          isFirstAddress={addresses.length === 0}
        />
      )}
    </div>
  );
}
