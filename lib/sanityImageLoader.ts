"use client";

// next/image loader (next.config.ts → images.loaderFile): Sanity's CDN does
// the resizing, so no Vercel image transformations are used. Any other URL
// (local /public files, avatars…) is returned unchanged.

import type { ImageLoaderProps } from "next/image";

export default function sanityImageLoader({ src, width, quality }: ImageLoaderProps): string {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return src;
  }
  if (url.hostname !== "cdn.sanity.io" || !url.pathname.startsWith("/images/")) return src;

  const p = url.searchParams;
  const w = Number(p.get("w"));
  const h = Number(p.get("h"));
  if (w > 0 && h > 0) p.set("h", String(Math.round((width * h) / w)));
  else p.delete("h");
  p.set("w", String(width));
  if (!p.has("fit")) p.set("fit", "max");
  p.set("q", String(quality || 70));
  p.set("auto", "format");
  return url.toString();
}
