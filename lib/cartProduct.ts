import type { Product } from "@/sanity.types";

// Kept apart from store.ts so server components (ProductCard) can slim a
// product without pulling the zustand store into the server bundle.

type ProductImage = NonNullable<Product["images"]>[number];

/**
 * The slice of a product the bag, wishlist and product cards actually use.
 * Only this is passed to client components and saved in localStorage — the
 * full Sanity document (description, reviews, refs…) never is. Prices here
 * are for display only: /api/checkout/quote and /api/orders recompute every
 * total from Sanity using just `_id` + quantity.
 */
export interface CartProduct {
  _id: string;
  name?: string;
  slug?: { current?: string };
  price?: number;
  discount?: number;
  stock?: number;
  status?: Product["status"];
  variant?: Product["variant"];
  /** First two photos (card + hover swap); bag thumbnails use the first */
  images?: ProductImage[];
  /** Total number of photos, for the "N photos" note on cards */
  imageCount?: number;
}

/** Anything product-shaped: a full Sanity product, an order line's product, or an already-slim one */
export type ProductLike = Omit<Partial<CartProduct>, "slug" | "status" | "variant" | "images"> & {
  _id: string;
  slug?: { current?: string } | null;
  status?: string | null;
  variant?: string | null;
  images?: unknown[] | null;
  /** Order lines carry a single image instead of `images` */
  image?: unknown;
};

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/** Reduce any product-shaped object to a CartProduct */
export function toCartProduct(product: ProductLike): CartProduct {
  const images = Array.isArray(product.images)
    ? product.images
    : product.image
      ? [product.image]
      : [];
  return {
    _id: product._id,
    name: product.name ?? undefined,
    slug: product.slug?.current ? { current: product.slug.current } : undefined,
    price: num(product.price),
    discount: num(product.discount),
    stock: num(product.stock),
    status: (product.status ?? undefined) as CartProduct["status"],
    variant: (product.variant ?? undefined) as CartProduct["variant"],
    images: images.length ? (images.slice(0, 2) as ProductImage[]) : undefined,
    imageCount: num(product.imageCount) ?? (images.length || undefined),
  };
}
