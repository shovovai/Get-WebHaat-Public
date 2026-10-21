import { image } from "@/sanity/image";

// Responsive images resized by Sanity's own CDN (cdn.sanity.io) — free and
// cached at the edge, so no Vercel image transformations are used.

export type SanityImageInput = Parameters<typeof image>[0];

export const SANITY_QUALITY = 70;
const SANITY_HOST = "cdn.sanity.io";

interface Options {
  /** height ÷ width — crops to this shape (respecting the hotspot); omit to keep the photo's own shape */
  ratio?: number;
}

const isSanityUrl = (src: string) => {
  try {
    return new URL(src).hostname === SANITY_HOST;
  } catch {
    return false;
  }
};

/** Rewrites an already-built cdn.sanity.io URL to a new width (height scaled to keep its shape) */
function resizeUrl(src: string, width: number, ratio?: number): string {
  const url = new URL(src);
  const p = url.searchParams;
  const w = Number(p.get("w"));
  const h = Number(p.get("h"));
  const shape = ratio ?? (w > 0 && h > 0 ? h / w : undefined);
  p.set("w", String(width));
  if (shape) {
    p.set("h", String(Math.round(width * shape)));
    if (!p.has("fit")) p.set("fit", "crop");
  } else {
    p.delete("h");
    if (!p.has("fit")) p.set("fit", "max");
  }
  if (!p.has("q")) p.set("q", String(SANITY_QUALITY));
  p.set("auto", "format");
  return url.toString();
}

/** One Sanity CDN URL at `width` CSS pixels. Non-Sanity strings come back unchanged. */
export function sanityUrl(source: SanityImageInput | string, width: number, { ratio }: Options = {}): string {
  if (typeof source === "string") return isSanityUrl(source) ? resizeUrl(source, width, ratio) : source;
  const b = image(source).width(width).quality(SANITY_QUALITY);
  return (ratio ? b.height(Math.round(width * ratio)).fit("crop") : b.fit("max")).url();
}

/** `srcSet` for the given widths, e.g. sanitySrcSet(photo, [320, 640, 960], { ratio: 5 / 4 }) */
export function sanitySrcSet(
  source: SanityImageInput | string,
  widths: readonly number[],
  options: Options = {}
): string | undefined {
  if (typeof source === "string" && !isSanityUrl(source)) return undefined;
  return widths.map((w) => `${sanityUrl(source, w, options)} ${w}w`).join(", ");
}

/** Intrinsic size from the asset id / URL ("…-2000x3000-jpg"), for width/height attributes */
export function sanityDimensions(source: SanityImageInput | string | undefined): { width: number; height: number } | undefined {
  if (!source) return undefined;
  let ref = "";
  if (typeof source === "string") ref = source;
  else if (typeof source === "object") {
    const asset = (source as { asset?: { _ref?: string; _id?: string; url?: string } }).asset;
    ref = asset?._ref || asset?._id || asset?.url || (source as { _ref?: string })._ref || "";
  }
  const m = /-(\d+)x(\d+)(?:[-.]|$)/.exec(ref);
  return m ? { width: Number(m[1]), height: Number(m[2]) } : undefined;
}

/**
 * Everything an <img> needs: src (middle width as fallback), srcSet, sizes and
 * width/height for the reserved aspect ratio.
 */
export function sanityImgProps(
  source: SanityImageInput | string,
  { widths, sizes, ratio }: { widths: readonly number[]; sizes: string; ratio?: number }
) {
  const fallback = widths[Math.min(widths.length - 1, Math.floor(widths.length / 2))];
  const intrinsic = sanityDimensions(source);
  const largest = widths[widths.length - 1];
  const width = ratio || !intrinsic ? largest : Math.min(largest, intrinsic.width);
  const height = ratio
    ? Math.round(largest * ratio)
    : intrinsic
      ? Math.round((width * intrinsic.height) / intrinsic.width)
      : undefined;
  const srcSet = sanitySrcSet(source, widths, { ratio });
  return {
    src: sanityUrl(source, fallback, { ratio }),
    srcSet,
    sizes: srcSet ? sizes : undefined,
    width,
    height,
  };
}
