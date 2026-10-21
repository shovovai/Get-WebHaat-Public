"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import useCartStore from "@/store";
import { image } from "@/sanity/image";
import { formatPrice } from "@/lib/storeConfig";
import QuantityButtons from "@/components/QuantityButtons";
import EmptyCart from "@/components/EmptyCart";
import OrderSummary from "@/components/checkout/OrderSummary";
import { useCheckoutQuote, useCouponCode } from "@/hooks/useCheckoutQuote";

export default function CartView() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [couponCode, setCouponCode] = useCouponCode();
  const { items, pricing, error, loading } = useCheckoutQuote(couponCode);
  const { deleteCartProduct, resetCart, addToFavorite, favoriteProduct } = useCartStore();

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg bg-sand" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-lg bg-sand" />
      </div>
    );
  }

  if (items.length === 0) return <EmptyCart />;

  const itemCount = items.reduce((n, i) => n + i.quantity, 0);

  return (
    <div className="grid items-start gap-8 pb-20 lg:grid-cols-[1fr_400px] lg:gap-12 lg:pb-0">
      <section>
        <div className="mb-4 flex items-center justify-between text-[15px]">
          <p className="text-ink">
            {itemCount} item{itemCount === 1 ? "" : "s"}
          </p>
          <button
            onClick={() => {
              if (window.confirm("Remove all items from your bag?")) {
                resetCart();
                toast.success("Bag cleared");
              }
            }}
            className="text-light-color underline underline-offset-4 hover:text-ink"
          >
            Clear bag
          </button>
        </div>

        <ul className="divide-y divide-black/10 border-y border-black/10">
          {items.map(({ product, quantity }) => {
            const saved = favoriteProduct.some((f) => f._id === product._id);
            const href = `/product/${product.slug?.current}`;
            return (
              <li key={product._id} className="flex gap-4 py-6 sm:gap-6">
                <Link href={href} className="relative block h-36 w-28 shrink-0 overflow-hidden rounded-md bg-sand sm:h-44 sm:w-36">
                  {product.images?.[0] && (
                    <img
                      src={image(product.images[0]).width(300).height(390).fit("crop").url()}
                      alt={product.name || "Product"}
                      className="h-full w-full object-cover"
                    />
                  )}
                </Link>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={href} className="line-clamp-2 text-lg leading-snug text-ink hover:underline">
                        {product.name}
                      </Link>
                      <p className="mt-1 text-[15px] text-light-color">{formatPrice(product.price)} each</p>
                      {typeof product.stock === "number" && product.stock <= 5 && (
                        <p className="mt-1 text-sm text-sale">Only {product.stock} left</p>
                      )}
                    </div>
                    <p className="shrink-0 text-lg font-semibold tabular-nums text-ink">
                      {formatPrice((product.price || 0) * quantity)}
                    </p>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
                    <QuantityButtons product={product} className="h-10 rounded-md border border-black/20 bg-white px-1.5 pb-0" />
                    <div className="flex items-center gap-5 text-[15px]">
                      <button
                        onClick={() => addToFavorite(product)}
                        className="text-ink underline underline-offset-4 hover:text-light-color"
                      >
                        {saved ? "Saved" : "Save for later"}
                      </button>
                      <button
                        onClick={() => {
                          deleteCartProduct(product._id);
                          toast.success(`${product.name} removed`);
                        }}
                        className="text-ink underline underline-offset-4 hover:text-sale"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <Link href="/shop" className="mt-6 inline-block text-[15px] text-ink underline underline-offset-4">
          Continue shopping
        </Link>
      </section>

      <OrderSummary
        pricing={pricing}
        loading={loading}
        error={error}
        couponCode={couponCode}
        onCouponChange={setCouponCode}
        className="lg:sticky lg:top-32"
      >
        <button
          onClick={() => router.push("/checkout")}
          disabled={!pricing || !!error}
          className="flex h-14 w-full items-center justify-center rounded-md bg-ink text-base font-medium text-white transition-colors hover:bg-black disabled:opacity-50"
        >
          Checkout
        </button>
      </OrderSummary>

      {/* Phones: total + checkout above the tab bar */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 lg:hidden">
        <div className="flex items-center gap-3 border-t border-black/[0.08] bg-white px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-light-color">Total</p>
            <p className="text-lg font-semibold leading-tight text-ink">{pricing ? formatPrice(pricing.total) : "…"}</p>
          </div>
          <button
            onClick={() => router.push("/checkout")}
            disabled={!pricing || !!error}
            className="flex h-12 items-center rounded-md bg-ink px-8 text-base font-medium text-white disabled:opacity-50"
          >
            Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
