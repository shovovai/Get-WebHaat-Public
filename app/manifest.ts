import type { MetadataRoute } from "next";
import { brand } from "@/config/brand";
import { getSiteSettings } from "@/lib/siteSeo";

export const revalidate = 3600;

// Makes the store installable ("Add to Home Screen") and app-like on phones.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const s = await getSiteSettings();
  const icon = s.faviconUrl;
  return {
    name: s.storeName,
    short_name: s.storeName.slice(0, 12),
    description: s.seoDescription || brand.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbf8f3",
    theme_color: s.themeColor || "#0a0a0a",
    categories: ["shopping"],
    icons: icon
      ? [
          { src: `${icon}?w=192&h=192&fit=max`, sizes: "192x192", type: "image/png", purpose: "any" },
          { src: `${icon}?w=512&h=512&fit=max`, sizes: "512x512", type: "image/png", purpose: "any" },
          { src: `${icon}?w=512&h=512&fit=max`, sizes: "512x512", type: "image/png", purpose: "maskable" },
        ]
      : [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
    shortcuts: [
      { name: "Shop", url: "/shop" },
      { name: "Today's deals", url: "/deal" },
      { name: "My orders", url: "/user/orders" },
      { name: "Cart", url: "/cart" },
    ],
  };
}
