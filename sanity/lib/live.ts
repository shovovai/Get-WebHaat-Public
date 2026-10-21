import "server-only";
import type { QueryParams } from "next-sanity";
import { client } from "./client";

/**
 * Uncached read for per-user data (orders, profile, addresses…). Keeps the
 * `{ data }` shape of the old next-sanity `defineLive` helper so existing
 * callers keep working, without its extra request per call or the live
 * listener (which was never mounted). Public catalog data must use
 * `cmsFetch` (sanity/lib/fetch.ts) instead, which is cached and tagged.
 */
export async function sanityFetch<const QueryString extends string>({
  query,
  params = {},
}: {
  query: QueryString;
  params?: QueryParams;
}) {
  const data = await client.fetch(query, params, { cache: "no-store" });
  return { data };
}
