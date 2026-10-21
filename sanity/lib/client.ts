import "server-only";
import { createClient } from "next-sanity";

import { apiVersion, dataset, projectId } from "../env";

// Read token: lets reads work with a PRIVATE dataset and with private.* documents.
const readToken = process.env.SANITY_API_READ_TOKEN || process.env.SANITY_API_TOKEN;

// Read-only client for uncached, per-user reads (orders, profile, cart…).
// Server-only. `perspective: "published"` so drafts never leak to visitors
// (the default `raw` perspective of apiVersion < 2025-02-19 returns drafts too).
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
  token: readToken,
  perspective: "published",
});

// Client behind cmsFetch (sanity/lib/fetch.ts) for public, cached catalog reads.
// No Sanity CDN: Next's data cache is the cache, invalidated by tag from the
// Sanity webhook (app/api/revalidate) — Sanity recommends useCdn: false with
// tag-based revalidation so a revalidation never re-reads a stale CDN copy.
export const cmsClient = client.withConfig({ useCdn: false });

// Write client for mutations (authenticated) - Use this for create, update, delete operations
export const writeClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false, // Don't use CDN for write operations
  token: process.env.SANITY_API_TOKEN, // Server-side token with write permissions
});
