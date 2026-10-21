"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag, X } from "lucide-react";
import useCartStore from "@/store";
import { image } from "@/sanity/image";
import { formatPrice } from "@/lib/storeConfig";
import HoverPanel from "./HoverPanel";

/** Bag icon with a hover preview of the items in the bag */
export default function MiniBag() {
  const { items, deleteCartProduct } = useCartStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const list = mounted ? items : [];
  const count = list.reduce((n, i) => n + i.quantity, 0);
  const subtotal = list.reduce((n, i) => n + (i.product.price || 0) * i.quantity, 0);

  return (
    <HoverPanel
      label="Shopping bag"
      panelClassName="w-[22rem] p-5"
      trigger={
        <Link
          href="/cart"
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-sand"
          aria-label={`Shopping bag${count ? `, ${count} items` : ""}`}
        >
          <ShoppingBag className="h-[22px] w-[22px]" strokeWidth={1.6} />
          {count > 0 && (
            <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[10px] font-semibold text-white">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Link>
      }
    >
      {list.length === 0 ? (
        <div className="py-4 text-center">
          <ShoppingBag className="mx-auto h-8 w-8 text-ink" strokeWidth={1.2} />
          <p className="mt-3 text-lg text-ink">Your bag is empty</p>
          <Link
            href="/shop"
            className="mt-4 inline-flex h-11 items-center rounded-md bg-ink px-6 text-[15px] font-medium text-white hover:bg-black"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <>
          <p className="text-lg text-ink">
            Shopping bag <span className="text-light-color">({count})</span>
          </p>
          <ul className="mt-3 max-h-72 divide-y divide-black/10 overflow-y-auto">
            {list.map(({ product, quantity }) => (
              <li key={product._id} className="flex gap-3 py-3">
                <Link href={`/product/${product.slug?.current}`} className="h-20 w-16 shrink-0 overflow-hidden rounded-md bg-sand">
                  {product.images?.[0] && (
                    <img
                      src={image(product.images[0]).width(128).height(160).fit("crop").url()}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/product/${product.slug?.current}`} className="line-clamp-2 text-[15px] leading-snug text-ink hover:underline">
                    {product.name}
                  </Link>
                  <p className="mt-1 text-sm text-light-color">
                    {quantity} × {formatPrice(product.price)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteCartProduct(product._id)}
                  className="self-start p-1 text-ink/40 hover:text-ink"
                  aria-label={`Remove ${product.name}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-center justify-between border-t border-black/10 pt-4 text-[15px]">
            <span className="text-light-color">Subtotal</span>
            <span className="font-semibold text-ink">{formatPrice(subtotal)}</span>
          </div>
          <p className="mt-1 text-xs text-light-color">Delivery calculated at checkout</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link
              href="/cart"
              className="flex h-11 items-center justify-center rounded-md border border-ink text-[15px] font-medium text-ink hover:bg-ink hover:text-white"
            >
              View bag
            </Link>
            <Link
              href="/checkout"
              className="flex h-11 items-center justify-center rounded-md bg-ink text-[15px] font-medium text-white hover:bg-black"
            >
              Checkout
            </Link>
          </div>
        </>
      )}
    </HoverPanel>
  );
}
