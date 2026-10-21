import type { MetadataRoute } from "next";
import { brand } from "@/config/brand";
import { getSiteSettings } from "@/lib/siteSeo";

export const revalidate = 3600;

// Private/transactional areas are never crawled. "Hide site from search
// engines" in Admin → SEO & Branding blocks everything (e.g. while testing).
export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSiteSettings();
  if (settings.noindex) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/og", "/llms.txt"],
        disallow: [
          "/api/",
          "/admin",
          "/studio",
          "/employee",
          "/user",
          "/dashboard",
          "/orders",
          "/cart",
          "/checkout",
          "/success",
          "/wishlist",
          "/sign-in",
          "/sign-up",
          "/newsletter/",
        ],
      },
    ],
    sitemap: `${brand.url}/sitemap.xml`,
    host: brand.url,
  };
}
