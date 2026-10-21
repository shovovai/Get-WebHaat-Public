import { formatPrice } from "@/lib/storeConfig";
import { Metadata } from "next";
import { brand } from "@/config/brand";
import type { StoreSettings } from "@/lib/storeSettings";
import { Product, Category } from "@/sanity.types";
import { urlFor } from "@/sanity/lib/image";

const BASE_URL = brand.url;

/**
 * Generate metadata for product pages
 */
export function generateProductMetadata(product: any): Metadata {
  const title = product.name || "Product";
  const description =
    product.description ||
    `Buy ${title} online at ${brand.name}. ${
      product.price ? `Price: ${formatPrice(product.price)}` : ""
    }`;
  const imageUrl = product.images?.[0]
    ? urlFor(product.images[0]).width(1200).url()
    : `${BASE_URL}/og?title=${encodeURIComponent(title)}`;
  const url = `${BASE_URL}/product/${product.slug?.current}`;

  // Extract brand name if it's populated
  const brandName =
    typeof product.brand === "object" ? product.brand?.name : "";

  return {
    title,
    description,
    keywords: [
      product.name || "",
      brandName || "",
      "buy online",
      "shop",
      "e-commerce",
    ].filter(Boolean),
    openGraph: {
      type: "website",
      url,
      title,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      siteName: "WebHaat",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: url,
    },
  };
}

/**
 * Generate metadata for category pages
 */
export function generateCategoryMetadata(
  category: Category,
  productCount: number = 0
): Metadata {
  const title = category.title || "Category";
  const description =
    category.description ||
    `Browse ${productCount} products in ${title} category at ${brand.name}. Find the best deals and quality items.`;
  const imageUrl = category.image
    ? urlFor(category.image).width(1200).url()
    : `${BASE_URL}/og?title=${encodeURIComponent(title)}`;
  const url = `${BASE_URL}/category/${category.slug?.current}`;

  return {
    title,
    description,
    keywords: [
      category.title || "",
      "category",
      "shop",
      "buy online",
      "e-commerce",
      "products",
    ].filter(Boolean),
    openGraph: {
      type: "website",
      url,
      title,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      siteName: "WebHaat",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: url,
    },
  };
}

/**
 * Generate Product Schema (JSON-LD) for rich snippets
 */
export function generateProductSchema(product: any) {
  const imageUrl = product.images?.[0] ? urlFor(product.images[0]).url() : "";

  // Extract brand name if it's populated
  const brandName =
    typeof product.brand === "object" ? product.brand?.name : "WebHaat";

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: imageUrl,
    sku: product._id,
    brand: {
      "@type": "Brand",
      name: brandName,
    },
    offers: {
      "@type": "Offer",
      url: `${BASE_URL}/product/${product.slug?.current}`,
      priceCurrency: "USD",
      price: product.price,
      priceValidUntil: new Date(
        new Date().setFullYear(new Date().getFullYear() + 1)
      )
        .toISOString()
        .split("T")[0],
      availability:
        product.stock && product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
    ...(product.averageRating && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: product.averageRating,
        reviewCount: product.totalReviews || 0,
        bestRating: 5,
        worstRating: 1,
      },
    }),
  };
}

/**
 * Generate BreadcrumbList Schema (JSON-LD)
 */
export function generateBreadcrumbSchema(
  items: Array<{ name: string; url: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${BASE_URL}${item.url}`,
    })),
  };
}

/**
 * Organization + WebSite schema (JSON-LD), driven by Admin → SEO & Branding
 */
export function generateOrganizationSchema(settings?: StoreSettings) {
  const name = settings?.storeName || brand.name;
  const logo = settings?.siteLogoUrl || settings?.faviconUrl || `${BASE_URL}/icon.svg`;
  const sameAs = settings
    ? [
        settings.facebookUrl,
        settings.instagramUrl,
        settings.twitterUrl,
        settings.youtubeUrl,
        settings.linkedinUrl,
        settings.tiktokUrl,
      ].filter(Boolean)
    : Object.values(brand.social);
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url: BASE_URL,
    logo,
    description: settings?.seoDescription || brand.description,
    ...((settings?.supportPhone || settings?.supportEmail) && {
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer service",
        ...(settings?.supportPhone && { telephone: settings.supportPhone }),
        ...(settings?.supportEmail && { email: settings.supportEmail }),
      },
    }),
    sameAs,
  };
}

export function generateWebsiteSchema(settings?: StoreSettings) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: settings?.storeName || brand.name,
    url: BASE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/shop?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Generate ItemList Schema for product listings
 */
export function generateItemListSchema(products: any[], listName: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${BASE_URL}/product/${product.slug?.current}`,
      name: product.name,
    })),
  };
}

/**
 * Generate Review Schema for product reviews
 */
export function generateReviewSchema(reviews: any[], product: Product) {
  if (!reviews || reviews.length === 0) return null;

  const reviewSchemas = reviews.map((review) => ({
    "@type": "Review",
    reviewRating: {
      "@type": "Rating",
      ratingValue: review.rating,
      bestRating: 5,
      worstRating: 1,
    },
    author: {
      "@type": "Person",
      name: review.userName || "Anonymous",
    },
    reviewBody: review.comment,
    datePublished: review._createdAt,
  }));

  return reviewSchemas;
}

/**
 * Generate FAQ Schema
 */
export function generateFAQSchema(
  faqs: Array<{ question: string; answer: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

/**
 * Helper to create canonical URL
 */
export function getCanonicalUrl(path: string): string {
  return `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Generate metadata for homepage
 */
export function generateHomeMetadata(): Metadata {
  return {
    title: "WebHaat - Your Trusted Online Shopping Destination",
    description:
      "Discover amazing products at WebHaat, your trusted online shopping destination for quality items and exceptional customer service. Shop electronics, fashion, home goods and more with fast delivery.",
    keywords: [
      "online shopping",
      "e-commerce",
      "buy online",
      "shop online",
      "best deals",
      "electronics",
      "fashion",
      "home goods",
    ],
    openGraph: {
      type: "website",
      url: BASE_URL,
      title: "WebHaat - Your Trusted Online Shopping Destination",
      description:
        "Discover amazing products at WebHaat. Shop electronics, fashion, home goods and more with fast delivery.",
      images: [
        {
          url: "/og-image.jpg",
          width: 1200,
          height: 630,
          alt: "WebHaat Online Store",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "WebHaat - Your Trusted Online Shopping Destination",
      description:
        "Discover amazing products at WebHaat. Shop electronics, fashion, home goods and more.",
      images: ["/og-image.jpg"],
    },
    alternates: {
      canonical: BASE_URL,
    },
  };
}
