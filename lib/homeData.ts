import "server-only";
import { cmsFetch } from "@/sanity/lib/fetch";
import { PRODUCT_CARD_FIELDS } from "@/sanity/queries/query";
import { TAGS } from "@/lib/cache";
import type { Category, Product } from "@/sanity.types";

// Home page sections: cached reads refreshed by tag (Sanity webhook), hourly at most otherwise
async function safeFetch<T>(
  query: string,
  fallback: T,
  tags: string[],
  params: Record<string, unknown> = {}
): Promise<T> {
  return (await cmsFetch<T | null>(query, params, { tags, fallback })) ?? fallback;
}

/** Hot or discounted products that are still in stock, biggest discount first */
export const getFlashDeals = () =>
  safeFetch<Product[]>(
    `*[_type == "product" && (status == "hot" || (discount > 0 && discount < 100)) && !(stock == 0)]
      | order(discount desc, _updatedAt desc)[0...10]{ ${PRODUCT_CARD_FIELDS} }`,
    [],
    [TAGS.products]
  );

/** Best-rated products (4+ stars) */
export const getTopRated = () =>
  safeFetch<Product[]>(
    `*[_type == "product" && averageRating >= 4] | order(averageRating desc, totalReviews desc)[0...10]{ ${PRODUCT_CARD_FIELDS} }`,
    [],
    [TAGS.products]
  );

/** Featured products picked in the admin panel */
export const getEditorsPicks = () =>
  safeFetch<Product[]>(
    `*[_type == "product" && isFeatured == true] | order(_updatedAt desc)[0...10]{ ${PRODUCT_CARD_FIELDS} }`,
    [],
    [TAGS.products]
  );

export interface CategoryShelf {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  image?: Category["image"];
  productCount: number;
  products: Product[];
}

/** The busiest categories, each with its newest products */
export async function getCategoryShelves(limit = 3): Promise<CategoryShelf[]> {
  // Rank and limit in GROQ, then fetch products only for the chosen shelves
  // (a few spare shelves in case some have fewer than 2 products)
  const shelves = await safeFetch<CategoryShelf[]>(
    `*[_type == "category" && defined(slug.current) && defined(title)]{
      _id, title, "slug": slug.current, description, image,
      "productCount": count(*[_type == "product" && references(^._id)])
    }[productCount >= 2] | order(productCount desc)[0...$take]{
      ...,
      "products": *[_type == "product" && references(^._id)] | order(_createdAt desc)[0...8]{ ${PRODUCT_CARD_FIELDS} }
    }`,
    [],
    [TAGS.categories, TAGS.products],
    { take: limit + 2 }
  );
  return shelves.filter((s) => s.title && s.products?.length >= 2).slice(0, limit);
}

export interface HomeReview {
  _id: string;
  rating: number;
  title?: string;
  content: string;
  isVerifiedPurchase?: boolean;
  firstName?: string;
  lastName?: string;
  product?: { name?: string; slug?: string; image?: NonNullable<Product["images"]>[number] };
}

/** Latest approved 4-5 star reviews with some text */
export const getHomeReviews = () =>
  safeFetch<HomeReview[]>(
    `*[_type == "review" && status == "approved" && rating >= 4 && length(content) > 20]
      | order(createdAt desc)[0...6]{
        _id, rating, title, content, isVerifiedPurchase,
        "firstName": user->firstName, "lastName": user->lastName,
        "product": product->{ name, "slug": slug.current, "image": images[0] }
      }`,
    [],
    [TAGS.reviews]
  );

/** Newest products for the "New arrivals" rail and the hero fallback */
export const getNewArrivals = () =>
  safeFetch<Product[]>(
    `*[_type == "product"] | order(_createdAt desc)[0...12]{ ${PRODUCT_CARD_FIELDS} }`,
    [],
    [TAGS.products]
  );

export interface HomeBrand {
  _id: string;
  title: string;
  slug?: string;
  description?: string;
  image?: Category["image"];
}

/** Brands for the "Our brands" band */
export const getHomeBrands = () =>
  safeFetch<HomeBrand[]>(
    `*[_type == "brand" && defined(title)] | order(title asc)[0...12]{ _id, title, "slug": slug.current, description, image }`,
    [],
    [TAGS.brands]
  );

export interface HomeCategory {
  _id: string;
  title: string;
  slug: string;
  image?: Category["image"];
  /** Newest product photo, used when the category has no image */
  productImage?: NonNullable<Product["images"]>[number];
  productCount: number;
}

/** Categories for the portrait "Shop by category" tiles */
export const getHomeCategories = () =>
  safeFetch<HomeCategory[]>(
    `*[_type == "category" && defined(slug.current) && defined(title)] | order(featured desc, title asc)[0...16]{
      _id, title, "slug": slug.current, image,
      "productImage": *[_type == "product" && references(^._id) && defined(images[0])] | order(_createdAt desc)[0].images[0],
      "productCount": count(*[_type == "product" && references(^._id)])
    }`,
    [],
    [TAGS.categories, TAGS.products]
  );

export interface LookSpot {
  _key: string;
  x: number;
  y: number;
  product: Product;
}

export interface HomeLook {
  _id: string;
  title: string;
  description?: string;
  image?: Category["image"];
  spots: LookSpot[];
}

/** "Style Guide" looks with their shoppable products */
export const getLookbooks = () =>
  safeFetch<HomeLook[]>(
    `*[_type == "lookbook" && active != false && defined(image)] | order(order asc, _createdAt desc)[0...6]{
      _id, title, description, image,
      "spots": coalesce(hotspots[defined(product->_id)]{ _key, x, y, "product": product->{ ${PRODUCT_CARD_FIELDS} } }, [])
    }`,
    [],
    [TAGS.homepage, TAGS.products]
  );
