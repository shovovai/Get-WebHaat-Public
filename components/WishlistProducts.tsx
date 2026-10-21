"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import useCartStore from "@/store";
import ProductCard from "./ProductCard";

/** Saved products, shown with the same cards as the shop */
const WishlistProducts = () => {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(12);
  const { favoriteProduct, resetFavorite } = useCartStore();
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 gap-x-6 gap-y-12 min-[480px]:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="aspect-[4/5] animate-pulse rounded-lg bg-sand" />
        ))}
      </div>
    );
  }

  if (!favoriteProduct.length) {
    return (
      <div className="rounded-lg bg-white px-6 py-20 text-center">
        <Heart className="mx-auto h-12 w-12 text-ink" strokeWidth={1.2} />
        <h2 className="mt-6 text-[28px] text-ink">Your wishlist is empty</h2>
        <p className="mx-auto mt-2 max-w-sm text-base text-light-color">
          Tap the heart on any product to save it here for later.
        </p>
        <Link
          href="/shop"
          className="mt-8 inline-flex h-12 items-center rounded-md bg-ink px-8 text-base font-medium text-white hover:bg-black"
        >
          Discover products
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between text-[15px]">
        <p className="text-ink">
          {favoriteProduct.length} saved item{favoriteProduct.length === 1 ? "" : "s"}
        </p>
        <button
          onClick={() => {
            if (window.confirm("Remove all items from your wishlist?")) {
              resetFavorite();
              toast.success("Wishlist cleared");
            }
          }}
          className="text-light-color underline underline-offset-4 hover:text-ink"
        >
          Clear wishlist
        </button>
      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-12 min-[480px]:grid-cols-2 lg:grid-cols-4">
        {favoriteProduct.slice(0, visible).map((product, i) => (
          <ProductCard key={product._id} product={product} priority={i < 4} />
        ))}
      </div>

      {visible < favoriteProduct.length && (
        <div className="mt-12 text-center">
          <button
            onClick={() => setVisible((v) => v + 12)}
            className="h-12 rounded-md border border-ink px-8 text-base font-medium text-ink hover:bg-ink hover:text-white"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
};

export default WishlistProducts;
