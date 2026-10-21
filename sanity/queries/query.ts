import { defineQuery } from "next-sanity";

/**
 * Only the product fields that product cards, the bag and the wishlist read
 * (ProductCard, AddToCartButton, ProductSideMenu, PriceView, store.ts,
 * ProductBrowser filters/sorting). Listings must never fetch full documents.
 * `images` keeps the first two photos (card + hover); `imageCount` the total.
 */
const PRODUCT_CARD_FIELDS = `_id, _type, _createdAt, name, slug, "images": images[0...2], "imageCount": count(images),
  price, discount, stock, status, variant`;

/** Teaser fields for journal cards (components/blog/ArticleCard.tsx) */
const BLOG_CARD_FIELDS = `_id, title, slug, mainImage, publishedAt, blogcategories[]->{ title }`;

const BANNER_QUERY = defineQuery(
  `*[_type == 'banner'] | order(publishedAt desc)[0...12]`
);
const FEATURED_CATEGORY_QUERY = defineQuery(
  `*[_type == 'category' && featured == true] | order(name desc)[0...$quantity]`
);
// Capped: listings render at most this many products
const ALL_PRODUCTS_QUERY = defineQuery(
  `*[_type=="product"] | order(name asc)[0...500]{ ${PRODUCT_CARD_FIELDS} }`
);
const DEAL_PRODUCTS = defineQuery(
  `*[_type == 'product' && status == 'hot'] | order(name asc)[0...100]{ ${PRODUCT_CARD_FIELDS} }`
);
const FEATURE_PRODUCTS = defineQuery(
  `*[_type == 'product' && isFeatured == true] | order(name asc)[0...100]{ ${PRODUCT_CARD_FIELDS} }`
);
const BRANDS_QUERY = defineQuery(
  `*[_type=='brand'] | order(title asc)[0...200]{ _id, title, slug, description, image }`
);

const LATEST_BLOG_QUERY = defineQuery(
  `*[_type == 'blog' && isLatest == true] | order(publishedAt desc)[0...3]{ ${BLOG_CARD_FIELDS} }`
);

const GET_ALL_BLOG = defineQuery(
  `*[_type == 'blog'] | order(publishedAt desc)[0...$quantity]{ ${BLOG_CARD_FIELDS} }`
);

const SINGLE_BLOG_QUERY =
  defineQuery(`*[_type == "blog" && slug.current == $slug][0]{
  ..., 
    author->{
    name,
    image,
  },
  blogcategories[]->{
    title,
    "slug": slug.current,
  },
}`);

const BLOG_CATEGORIES = defineQuery(
  `*[_type == "blogcategory"] | order(title asc)[0...100]{ _id, title, "slug": slug.current }`
);

const OTHERS_BLOG_QUERY = defineQuery(`*[
  _type == "blog"
  && defined(slug.current)
  && slug.current != $slug
]|order(publishedAt desc)[0...$quantity]{ ${BLOG_CARD_FIELDS} }`);

// Address Query
const ADDRESS_QUERY = defineQuery(
  `*[_type=="address"] | order(publishedAt desc)`
);

const ALLCATEGORIES_QUERY = defineQuery(
  `*[_type == 'category'] | order(name asc) [0...$quantity]`
);

const ADMIN_CATEGORIES_QUERY = defineQuery(
  `*[_type == 'category'] | order(title asc) {
    _id,
    title,
    slug,
    description,
    featured
  }`
);

// One request per product page: the document, its brand name, rating stats
// and the latest 20 approved reviews (rendered server-side by ProductReviews).
// approvedRatings: just the star numbers, for the 5..1 distribution bars.
const PRODUCT_BY_SLUG_QUERY = defineQuery(
  `*[_type == "product" && slug.current == $slug] | order(name asc) [0]{
    ...,
    "brandName": brand->title,
    "averageRating": math::avg(*[_type == "review" && product._ref == ^._id && status == "approved"].rating),
    "totalReviews": count(*[_type == "review" && product._ref == ^._id && status == "approved"]),
    "approvedRatings": *[_type == "review" && product._ref == ^._id && status == "approved"].rating,
    "latestReviews": *[_type == "review" && product._ref == ^._id && status == "approved"] | order(createdAt desc)[0...20]{
      _id, rating, title, content, helpful, isVerifiedPurchase, createdAt,
      "user": user->{ _id, firstName, lastName, profileImage{ asset->{ url } } }
    }
  }`
);

const RELATED_PRODUCTS_QUERY = defineQuery(
  `*[_type == "product" && count((categories[]._ref)[@ in $categoryIds]) > 0 && slug.current != $currentSlug] | order(name asc) [0...$limit]{
    ${PRODUCT_CARD_FIELDS}
  }`
);

const BRAND_QUERY = defineQuery(`*[_type == "product" && slug.current == $slug]{
"brandName": brand->title
}`);

export {
  PRODUCT_CARD_FIELDS,
  BLOG_CARD_FIELDS,
  BANNER_QUERY,
  FEATURED_CATEGORY_QUERY,
  ALL_PRODUCTS_QUERY,
  DEAL_PRODUCTS,
  FEATURE_PRODUCTS,
  BRANDS_QUERY,
  LATEST_BLOG_QUERY,
  SINGLE_BLOG_QUERY,
  GET_ALL_BLOG,
  BLOG_CATEGORIES,
  OTHERS_BLOG_QUERY,
  ADDRESS_QUERY,
  ALLCATEGORIES_QUERY,
  ADMIN_CATEGORIES_QUERY,
  PRODUCT_BY_SLUG_QUERY,
  RELATED_PRODUCTS_QUERY,
  BRAND_QUERY,
};
