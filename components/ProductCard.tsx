import { memo } from "react";
import Link from "next/link";
import { toCartProduct, type CartProduct } from "@/lib/cartProduct";
import { sanityImgProps } from "@/lib/sanityImage";
import PriceView from "./PriceView";
import AddToCartButton from "./AddToCartButton";
import ProductSideMenu from "./ProductSideMenu";

const CARD_WIDTHS = [240, 320, 480, 640, 800] as const;
/** Matches the listing grids: 1 column on phones, 2 from 480px, 4 from 1024px (1280px container) */
const GRID_SIZES = "(min-width: 1280px) 300px, (min-width: 1024px) 24vw, (min-width: 480px) 50vw, 100vw";

interface Props {
  /** A full Sanity product or an already-slim CartProduct (wishlist) */
  product: CartProduct;
  /** Above-the-fold card: load its photo eagerly (first ~4 cards of a grid) */
  priority?: boolean;
  /** `sizes` for the photo — override for rails or other layouts */
  sizes?: string;
}

// Portrait card: photo with Sale badge and bag button, then name and price
const ProductCard = memo(({ product, priority = false, sizes = GRID_SIZES }: Props) => {
  // Client children (bag/wishlist buttons) only get the fields they use
  const slim = toCartProduct(product);
  const href = `/product/${product?.slug?.current}`;
  const outOfStock = product?.stock === 0;
  const discount = product?.discount && product.discount > 0 && product.discount < 100 ? product.discount : 0;
  const [first, second] = product?.images ?? [];
  const imageCount = product?.imageCount ?? product?.images?.length ?? 0;
  const photo = (src: NonNullable<typeof first>) =>
    sanityImgProps(src, { widths: CARD_WIDTHS, sizes, ratio: 5 / 4 });

  return (
    <article className="group relative flex flex-col">
      <div className="relative overflow-hidden rounded-lg bg-sand">
        <Link href={href} aria-label={product?.name} className="block aspect-[4/5]">
          {first && (
            <img
              {...photo(first)}
              alt={product?.name || "Product image"}
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : undefined}
              decoding="async"
              className={`absolute inset-0 h-full w-full object-cover transition duration-700 ${
                outOfStock ? "opacity-50 grayscale" : "group-hover:scale-[1.03]"
              } ${second ? "lg:group-hover:opacity-0" : ""}`}
            />
          )}
          {/* Second photo fades in on hover (desktop) */}
          {second && (
            <img
              {...photo(second)}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 hidden h-full w-full object-cover opacity-0 transition duration-700 group-hover:opacity-100 lg:block"
            />
          )}
        </Link>

        {/* Badges */}
        <div className="pointer-events-none absolute right-4 top-4 flex flex-col items-end gap-1.5">
          {(discount > 0 || product?.status === "sale") && !outOfStock && (
            <span className="rounded-[4px] bg-sale px-4 py-1 text-[13px] font-medium text-white">Sale</span>
          )}
          {product?.status === "new" && (
            <span className="rounded-[4px] bg-ink px-4 py-1 text-[13px] font-medium text-white">New</span>
          )}
          {outOfStock && (
            <span className="rounded-[4px] bg-white px-4 py-1 text-[13px] font-medium text-ink">Sold out</span>
          )}
        </div>

        <ProductSideMenu product={slim} className="left-4 right-auto top-4 opacity-100 lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100" />

        {!outOfStock && (
          <div className="absolute bottom-3 left-3">
            <AddToCartButton product={slim} compact variant="square" />
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-start justify-between gap-3">
          <Link href={href} className="line-clamp-2 text-lg leading-snug text-ink hover:underline">
            {product?.name}
          </Link>
          {product?.status === "hot" && (
            <span className="shrink-0 pt-1 text-sm text-light-color">Trending</span>
          )}
        </div>
        {imageCount > 1 && <p className="mt-1 text-sm text-light-color">{imageCount} photos</p>}
        <div className="mt-2">
          <PriceView price={product?.price} discount={product?.discount} size="md" />
        </div>
      </div>
    </article>
  );
});

ProductCard.displayName = "ProductCard";

export default ProductCard;
