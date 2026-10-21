import type { MetadataRoute } from "next";
import { brand } from "@/config/brand";
import { client } from "@/sanity/lib/client";
import { getSiteSettings } from "@/lib/siteSeo";

const BASE_URL = brand.url;

// Rebuilt at most once an hour so new products appear automatically
export const revalidate = 3600;

interface Entry {
  slug: string;
  _updatedAt: string;
  image?: string;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getSiteSettings();
  if (settings.noindex) return [];

  const data = await client.fetch<{
    products: Entry[];
    categories: Entry[];
    brands: Entry[];
    blogs: Entry[];
  }>(`{
    "products": *[_type == "product" && defined(slug.current)]{ "slug": slug.current, _updatedAt, "image": images[0].asset->url },
    "categories": *[_type == "category" && defined(slug.current)]{ "slug": slug.current, _updatedAt, "image": image.asset->url },
    "brands": *[_type == "brand" && defined(slug.current)]{ "slug": slug.current, _updatedAt },
    "blogs": *[_type == "blog" && defined(slug.current)]{ "slug": slug.current, _updatedAt, "image": mainImage.asset->url }
  }`);

  const now = new Date();
  const page = (
    path: string,
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
    priority: number
  ) => ({ url: `${BASE_URL}${path}`, lastModified: now, changeFrequency, priority });

  const staticPages: MetadataRoute.Sitemap = [
    page("", "daily", 1),
    page("/shop", "daily", 0.9),
    page("/deal", "daily", 0.8),
    page("/category", "weekly", 0.8),
    page("/brands", "weekly", 0.7),
    page("/blog", "weekly", 0.6),
    page("/about", "monthly", 0.5),
    page("/delivery-returns", "monthly", 0.4),
    page("/contact", "monthly", 0.5),
    page("/faq", "monthly", 0.4),
    page("/help", "monthly", 0.4),
    page("/terms", "yearly", 0.2),
    page("/privacy", "yearly", 0.2),
  ];

  const entries = (items: Entry[], prefix: string, changeFrequency: "weekly" | "monthly", priority: number) =>
    (items || []).map((item) => ({
      url: `${BASE_URL}${prefix}/${item.slug}`,
      lastModified: new Date(item._updatedAt),
      changeFrequency,
      priority,
      ...(item.image && { images: [item.image] }),
    }));

  return [
    ...staticPages,
    ...entries(data.products, "/product", "weekly", 0.8),
    ...entries(data.categories, "/category", "weekly", 0.7),
    ...entries(data.brands, "/brands", "monthly", 0.6),
    ...entries(data.blogs, "/blog", "monthly", 0.5),
  ];
}
