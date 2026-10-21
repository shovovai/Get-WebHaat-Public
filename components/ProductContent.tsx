"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Share2, ShoppingBag, Star } from "lucide-react";
import { toast } from "sonner";
import AddToCartButton from "@/components/AddToCartButton";
import Container from "@/components/Container";
import PriceView from "@/components/PriceView";
import ProductReviews from "@/components/ProductReviews";
import ProductGallery from "@/components/product/ProductGallery";
import RelatedProducts from "./RelatedProducts";
import { trackProductView } from "@/lib/analytics";
import { recordRecentlyViewed } from "@/lib/recentlyViewed";
import { formatPrice } from "@/lib/storeConfig";
import { BRAND_QUERYResult, Product } from "@/sanity.types";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import useCartStore from "@/store";
import { cn } from "@/lib/utils";

interface ProductContentProps {
  product: Product;
  relatedProducts: Product[];
  brand: BRAND_QUERYResult | null;
}

const Accordion = ({ title, children, open }: { title: string; children: React.ReactNode; open?: boolean }) => (
  <details open={open} className="group border-b border-black/10">
    <summary className="flex cursor-pointer list-none items-center justify-between py-5 text-[15px] font-medium text-ink [&::-webkit-details-marker]:hidden">
      {title}
      <span className="text-xl leading-none text-ink/60 transition-transform group-open:rotate-45">+</span>
    </summary>
    <div className="pb-6 text-sm leading-relaxed text-light-color">{children}</div>
  </details>
);

const ProductContent = ({ product, relatedProducts, brand }: ProductContentProps) => {
  const averageRating = product?.averageRating || 0;
  const totalReviews = product?.totalReviews || 0;
  const brandName = brand?.[0]?.brandName;
  const stock = product?.stock ?? 0;
  const { deliveryCharge, freeDeliveryOver } = useSiteSettings();
  const { favoriteProduct, addToFavorite, addItem, getItemCount } = useCartStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const inBag = mounted ? getItemCount(product._id) : 0;
  const saved = favoriteProduct.some((f) => f._id === product._id);

  useEffect(() => {
    if (product) {
      trackProductView({ productId: product._id, name: product.name || "Unknown" });
      recordRecentlyViewed(product);
    }
  }, [product]);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: product?.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {
      /* user cancelled */
    }
  };

  const addToBag = () => {
    if (stock <= inBag) {
      toast.error("No more stock available");
      return;
    }
    addItem(product);
    toast.success(`${product?.name} added to your bag`);
  };

  const toggleWishlist = async () => {
    await addToFavorite(product);
    toast.success(saved ? "Removed from wishlist" : "Added to wishlist");
  };

  const deliveryText =
    deliveryCharge <= 0
      ? "Free delivery on every order."
      : freeDeliveryOver > 0
        ? `Delivery charge ${formatPrice(deliveryCharge)}. Free delivery on orders over ${formatPrice(freeDeliveryOver)}.`
        : `Delivery charge ${formatPrice(deliveryCharge)} per order.`;

  const details: [string, React.ReactNode][] = [
    ["Brand", brandName || "—"],
    ["Type", product?.variant ? product.variant.replace(/^\w/, (c) => c.toUpperCase()) : "—"],
    ["Availability", stock > 0 ? `${stock} in stock` : "Sold out"],
  ];

  return (
    <Container className="pb-8">
      <nav aria-label="Breadcrumb" className="hidden py-5 text-sm sm:block">
        <ol className="flex flex-wrap items-center gap-2 text-light-color">
          <li>
            <Link href="/" className="text-ink underline underline-offset-4">
              Home
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href="/shop" className="text-ink underline underline-offset-4">
              Shop
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="line-clamp-1">{product?.name}</li>
        </ol>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,560px)_minmax(0,440px)] lg:justify-center lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <ProductGallery images={product?.images} alt={product?.name || "Product"} soldOut={stock === 0} />
        </div>

        <div>
          <nav aria-label="Breadcrumb" className="-mt-4 mb-5 text-[15px] sm:hidden">
            <Link href="/" className="text-ink underline underline-offset-4">
              Home
            </Link>
            <span className="mx-2 text-light-color">/</span>
            <span className="text-light-color">{product?.name}</span>
          </nav>
          {brandName && (
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.3em] text-light-color">{brandName}</p>
          )}
          <h1 className="text-[28px] leading-tight text-ink sm:text-[32px]">{product?.name}</h1>
          {product?.slug?.current && (
            <p className="mt-1 text-[15px] text-light-color">Product code: {product.slug.current.toUpperCase()}</p>
          )}

          <div className="mt-5">
            <PriceView price={product?.price} discount={product?.discount} size="lg" />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <a href="#reviews" className="flex items-center gap-1.5 text-light-color hover:text-ink">
              <span className="flex">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-4 w-4",
                      i < Math.round(averageRating) ? "fill-ink text-ink" : "text-ink/25"
                    )}
                  />
                ))}
              </span>
              {totalReviews ? `${averageRating.toFixed(1)} (${totalReviews})` : "No reviews yet"}
            </a>
            <span
              className={cn(
                "font-medium",
                stock === 0 ? "text-sale" : stock <= 5 ? "text-marigold" : "text-sage"
              )}
            >
              {stock === 0 ? "Sold out" : stock <= 5 ? `Only ${stock} left` : "In stock"}
            </span>
          </div>

          <div className="mt-8 hidden space-y-3 lg:block">
            <AddToCartButton product={product} className="h-14 text-base" />
            <button
              type="button"
              onClick={toggleWishlist}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-md border border-ink text-base font-medium text-ink transition-colors hover:bg-ink hover:text-white"
            >
              <Heart className={cn("h-5 w-5", saved && "fill-current")} strokeWidth={1.6} />
              {saved ? "Saved to wishlist" : "Add to wishlist"}
            </button>
          </div>

          <div className="mt-8 border-t border-black/10">
            <Accordion title="Description" open>
              {product?.description ? (
                <p className="whitespace-pre-line">{product.description}</p>
              ) : (
                <p>No description yet.</p>
              )}
            </Accordion>
            <Accordion title="Delivery & returns">
              <ul className="space-y-2">
                <li>{deliveryText}</li>
                <li>Cash on delivery available — pay when your order arrives.</li>
                <li>Easy returns within 7 days of delivery.</li>
              </ul>
            </Accordion>
            <Accordion title="Product details">
              <dl className="divide-y divide-black/5">
                {details.map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 py-2">
                    <dt>{label}</dt>
                    <dd className="text-right text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </Accordion>
          </div>

          <button
            type="button"
            onClick={share}
            className="mt-6 inline-flex items-center gap-2 text-sm text-ink underline underline-offset-4"
          >
            <Share2 className="h-4 w-4" strokeWidth={1.6} /> Share this product
          </button>
        </div>
      </div>

      <section id="reviews" className="mt-24 scroll-mt-32">
        <ProductReviews productId={product._id} productName={product.name || "this product"} />
      </section>

      <RelatedProducts currentProduct={product} relatedProducts={relatedProducts} />

      {/* Phones: "Add to bag" bar fixed to the bottom (the tab bar is hidden on product pages) */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-ink pb-[env(safe-area-inset-bottom)] lg:hidden">
        {inBag > 0 ? (
          <Link href="/cart" className="flex h-16 items-center justify-center gap-2 text-lg font-medium text-white">
            <ShoppingBag className="h-5 w-5" strokeWidth={1.6} /> View bag ({inBag})
          </Link>
        ) : (
          <button
            type="button"
            onClick={addToBag}
            disabled={stock === 0}
            className="flex h-16 w-full items-center justify-center gap-2 text-lg font-medium text-white disabled:opacity-50"
          >
            <ShoppingBag className="h-5 w-5" strokeWidth={1.6} /> {stock === 0 ? "Sold out" : "Add to bag"}
          </button>
        )}
      </div>
    </Container>
  );
};

export default ProductContent;
