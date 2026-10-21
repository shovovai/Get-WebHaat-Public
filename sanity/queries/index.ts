import { cache } from "react";
import { cmsFetch } from "../lib/fetch";
import { sanityFetch } from "../lib/live";
import { TAGS } from "@/lib/cache";
import type { Product } from "@/sanity.types";
import {
  ADDRESS_QUERY,
  ALL_PRODUCTS_QUERY,
  ADMIN_CATEGORIES_QUERY,
  BANNER_QUERY,
  BLOG_CATEGORIES,
  BRANDS_QUERY,
  DEAL_PRODUCTS,
  FEATURE_PRODUCTS,
  FEATURED_CATEGORY_QUERY,
  GET_ALL_BLOG,
  LATEST_BLOG_QUERY,
  OTHERS_BLOG_QUERY,
  PRODUCT_BY_SLUG_QUERY,
  RELATED_PRODUCTS_QUERY,
  SINGLE_BLOG_QUERY,
} from "./query";
import { getOrderById } from "./userQueries";
import type {
  BANNER_QUERYResult,
  BRAND_QUERYResult,
  PRODUCT_BY_SLUG_QUERYResult,
  SINGLE_BLOG_QUERYResult,
} from "@/sanity.types";

// ============================================================================
// CACHED CATALOG READS
// All go through cmsFetch: published content only, cached in Next's data
// cache for up to an hour and refreshed on demand by tag (lib/cache.ts TAGS,
// invalidated by the Sanity webhook in app/api/revalidate). Wrapped in React
// `cache` so generateMetadata and the page share one read per request.
// ============================================================================

/** Card-sized product (see PRODUCT_CARD_FIELDS); typed as Product for the shared components */
type CardProduct = Product;

/** Blog teaser (see BLOG_CARD_FIELDS) */
export interface BlogCard {
  _id: string;
  title?: string | null;
  slug?: { current?: string } | null;
  mainImage?: NonNullable<SINGLE_BLOG_QUERYResult>["mainImage"] | null;
  publishedAt?: string | null;
  blogcategories?: { title?: string | null }[] | null;
}

export interface ProductReview {
  _id: string;
  rating: number;
  title: string;
  content: string;
  helpful: number;
  isVerifiedPurchase: boolean;
  createdAt: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    profileImage?: { asset: { url: string } };
  } | null;
}

/** Product page document: full product + brand name + review data */
export type ProductDetail = NonNullable<PRODUCT_BY_SLUG_QUERYResult> & {
  brandName?: string | null;
  approvedRatings?: number[] | null;
  latestReviews?: ProductReview[] | null;
};

/** Sale/campaign banners */
const getBanner = cache(() =>
  cmsFetch<BANNER_QUERYResult>(BANNER_QUERY, {}, { tags: [TAGS.banners], fallback: [] })
);

/** Featured categories */
const getFeaturedCategory = cache((quantity: number) =>
  cmsFetch<unknown[]>(FEATURED_CATEGORY_QUERY, { quantity }, { tags: [TAGS.categories], fallback: [] })
);

/** All products (card fields, capped at 500) */
const getAllProducts = cache(() =>
  cmsFetch<CardProduct[]>(ALL_PRODUCTS_QUERY, {}, { tags: [TAGS.products], fallback: [] })
);

/** "Hot" products (card fields) */
const getDealProducts = cache(() =>
  cmsFetch<CardProduct[]>(DEAL_PRODUCTS, {}, { tags: [TAGS.products], fallback: [] })
);

/** Featured products (card fields) */
const getFeaturedProducts = cache(() =>
  cmsFetch<CardProduct[]>(FEATURE_PRODUCTS, {}, { tags: [TAGS.products], fallback: [] })
);

/** All brands */
const getAllBrands = cache(() =>
  cmsFetch<unknown[]>(BRANDS_QUERY, {}, { tags: [TAGS.brands], fallback: [] })
);

/** Latest three articles marked "latest" */
const getLatestBlogs = cache(() =>
  cmsFetch<BlogCard[]>(LATEST_BLOG_QUERY, {}, { tags: [TAGS.blogs], fallback: [] })
);

/** Newest articles (teaser fields) */
const getAllBlogs = cache((quantity: number) =>
  cmsFetch<BlogCard[]>(GET_ALL_BLOG, { quantity }, { tags: [TAGS.blogs], fallback: [] })
);

/** One article, or null when it does not exist */
const getSingleBlog = cache(async (slug: string) => {
  const blog = await cmsFetch<SINGLE_BLOG_QUERYResult>(
    SINGLE_BLOG_QUERY,
    { slug },
    { tags: [TAGS.blog(slug)] }
  );
  return blog ?? null;
});

/** Blog categories */
const getBlogCategories = cache(() =>
  cmsFetch<unknown[]>(BLOG_CATEGORIES, {}, { tags: [TAGS.blogs], fallback: [] })
);

/** Other recent articles (teaser fields), excluding `slug` */
const getOthersBlog = cache((slug: string, quantity: number) =>
  cmsFetch<BlogCard[]>(OTHERS_BLOG_QUERY, { slug, quantity }, { tags: [TAGS.blogs], fallback: [] })
);

/**
 * Get addresses - not cached (user-specific data)
 */
const getAddresses = async () => {
  try {
    const { data } = await sanityFetch({
      query: ADDRESS_QUERY,
    });
    return data ?? [];
  } catch (error) {
    console.error("Error fetching address:", error);
    return [];
  }
};

/** Categories for navigation/footer links (slim, capped) */
const getCategories = cache((quantity: number = 50) =>
  cmsFetch<{ _id: string; title?: string; slug?: { current?: string } }[]>(
    `*[_type == 'category' && defined(slug.current)] | order(title asc) [0...$quantity]{ _id, title, slug }`,
    { quantity },
    { tags: [TAGS.categories], fallback: [] }
  )
);

/**
 * Get admin categories - not cached (admin data needs to be fresh)
 */
const getAdminCategories = async () => {
  try {
    const { data } = await sanityFetch({ query: ADMIN_CATEGORIES_QUERY });
    return data ?? [];
  } catch (error) {
    console.error("Error fetching admin categories:", error);
    return [];
  }
};

/** Product page data, or null when the product does not exist */
const getProductBySlug = cache(async (slug: string) => {
  const product = await cmsFetch<ProductDetail | null>(
    PRODUCT_BY_SLUG_QUERY,
    { slug },
    { tags: [TAGS.product(slug)] }
  );
  return product ?? null;
});

/** Brand name of a product (read from the product page query, no extra request) */
const getBrand = cache(async (slug: string): Promise<BRAND_QUERYResult> => {
  const product = await getProductBySlug(slug);
  return product ? [{ brandName: product.brandName ?? null }] : [];
});

/** Other products from the same categories (card fields) */
const getRelatedProducts = cache(
  async (categoryIds: string[], currentSlug: string, limit: number = 4) => {
    if (!categoryIds.length) return [];
    return cmsFetch<CardProduct[]>(
      RELATED_PRODUCTS_QUERY,
      { categoryIds, currentSlug, limit },
      // Tagged with the current product only: a product edit should not
      // regenerate every product page; the hourly refresh covers this rail
      { tags: [TAGS.product(currentSlug)], fallback: [] }
    );
  }
);

export {
  getBanner,
  getFeaturedCategory,
  getAllProducts,
  getDealProducts,
  getFeaturedProducts,
  getAllBrands,
  getLatestBlogs,
  getSingleBlog,
  getAllBlogs,
  getBlogCategories,
  getOthersBlog,
  getAddresses,
  getCategories,
  getAdminCategories,
  getProductBySlug,
  getBrand,
  getRelatedProducts,
  getOrderById,
};
