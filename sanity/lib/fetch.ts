import "server-only";
import type { QueryParams } from "next-sanity";
import { cmsClient } from "./client";

/**
 * Safety-net lifetime for cached CMS reads. Real freshness comes from tags:
 * the Sanity webhook (app/api/revalidate) and admin routes call revalidateTag.
 */
export const CMS_REVALIDATE = 3600;

const isBuild = process.env.NEXT_PHASE === "phase-production-build";

interface CmsFetchOptions<T> {
  /** Cache tags (see TAGS in lib/cache.ts) */
  tags?: string[];
  /** Seconds before a background refresh; defaults to CMS_REVALIDATE */
  revalidate?: number;
  /**
   * Returned instead of throwing ONLY during `next build` (e.g. Sanity
   * unreachable), so the build still passes with empty sections. At runtime
   * errors are thrown on purpose: a failed ISR regeneration keeps serving the
   * last good page instead of caching an empty one (or a false 404).
   */
  fallback?: T;
}

/**
 * The one read path for public catalog data: published documents only,
 * cached in Next's data cache and tagged for on-demand revalidation.
 */
export async function cmsFetch<T>(
  query: string,
  params: QueryParams = {},
  { tags = [], revalidate = CMS_REVALIDATE, fallback }: CmsFetchOptions<T> = {}
): Promise<T> {
  try {
    return await cmsClient.fetch<T>(query, params, { next: { revalidate, tags } });
  } catch (error) {
    if (isBuild && fallback !== undefined) {
      console.warn(`[cmsFetch] build-time fetch failed, using fallback (${tags.join(",") || "untagged"})`);
      return fallback;
    }
    throw error;
  }
}
