/**
 * Cache tags and invalidation helpers.
 *
 * Public pages are static/ISR: every CMS read goes through `cmsFetch`
 * (sanity/lib/fetch.ts) with tags from TAGS below. Content changes invalidate
 * those tags — from the Sanity webhook (app/api/revalidate/route.ts) and from
 * the admin routes via the helpers here — so only pages that used the changed
 * data are regenerated, on their next visit. Never purge the whole site with
 * revalidatePath("/", "layout").
 */

import { revalidatePath, revalidateTag } from "next/cache";

// ============================================================================
// CACHE TAGS
// ============================================================================

export const TAGS = {
  /** Every product list (shop, categories, brands, home rails, menu, deal) */
  products: "products",
  /** One product page (its document, reviews and rating) */
  product: (slug: string) => `product:${slug}`,
  categories: "categories",
  category: (slug: string) => `category:${slug}`,
  brands: "brands",
  brand: (slug: string) => `brand:${slug}`,
  blogs: "blogs",
  blog: (slug: string) => `blog:${slug}`,
  banners: "banners",
  /** Home-only content (lookbooks) */
  homepage: "homepage",
  /** Approved reviews shown outside product pages (home "Customer reviews") */
  reviews: "reviews",
  /** Admin → Settings (lib/storeSettings.ts); name kept for existing admin routes */
  storeSettings: "storeSettings",
  /** Admin → Payments (lib/paymentConfig.ts); name kept for existing admin routes */
  paymentSettings: "paymentSettings",
} as const;

/**
 * Stale-while-revalidate: the next visitor still gets the cached page while
 * a fresh one renders in the background (recommended `max` profile).
 */
export function invalidateTags(tags: Iterable<string>) {
  for (const tag of new Set(tags)) revalidateTag(tag, "max");
}

/**
 * Tags to invalidate when a Sanity document of `type` changes. Used by the
 * webhook; `slug` is the document's slug (for reviews: their product's slug).
 */
export function tagsForDocument(type: string, slug?: string | null): string[] {
  const s = typeof slug === "string" && slug ? slug : null;
  switch (type) {
    case "product":
      return [TAGS.products, ...(s ? [TAGS.product(s)] : [])];
    case "category":
      return [TAGS.categories, ...(s ? [TAGS.category(s)] : [])];
    case "brand":
      return [TAGS.brands, ...(s ? [TAGS.brand(s)] : [])];
    case "blog":
      return [TAGS.blogs, ...(s ? [TAGS.blog(s)] : [])];
    case "blogcategory":
    case "author":
      return [TAGS.blogs];
    case "banner":
      return [TAGS.banners];
    case "lookbook":
      return [TAGS.homepage];
    case "review":
      return [TAGS.reviews, ...(s ? [TAGS.product(s)] : [])];
    case "storeSettings":
      return [TAGS.storeSettings];
    case "paymentSettings":
      return [TAGS.paymentSettings];
    default:
      return [];
  }
}

// ============================================================================
// CACHE INVALIDATION HELPERS (admin routes / server actions)
// ============================================================================

/** Products were added or removed: refresh every product list */
export async function invalidateProducts() {
  invalidateTags([TAGS.products]);
}

/**
 * One product changed. Without a slug (e.g. after a delete) only the lists
 * are refreshed; the Sanity webhook also covers the product page itself.
 */
export async function invalidateProduct(productId: string, productSlug?: string) {
  invalidateTags([TAGS.products, ...(productSlug ? [TAGS.product(productSlug)] : [])]);
}

/** Reviews of a product changed (approval, helpful votes) */
export async function invalidateProductReviews(productSlug?: string) {
  invalidateTags([TAGS.reviews, ...(productSlug ? [TAGS.product(productSlug)] : [])]);
}

/** Category name/description/image changed */
export async function invalidateCategory(categorySlug: string) {
  invalidateTags([TAGS.categories, TAGS.category(categorySlug)]);
}

/** Brand changed */
export async function invalidateBrand(brandSlug: string) {
  invalidateTags([TAGS.brands, TAGS.brand(brandSlug)]);
}

/** Blog post changed */
export async function invalidateBlog(blogSlug: string) {
  invalidateTags([TAGS.blogs, TAGS.blog(blogSlug)]);
}

/**
 * Order status changed. Order pages are per-user and dynamic, so this only
 * refreshes the admin/employee order views and the user's order list.
 */
export async function invalidateOrder(orderId: string, userId?: string) {
  revalidatePath("/user/orders", "page");
  if (userId) {
    revalidatePath("/user", "layout");
  }
  // Invalidate admin/employee order views
  revalidatePath("/admin", "layout");
  revalidatePath("/employee", "layout");
}
