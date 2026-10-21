import { randomUUID } from "node:crypto";

/*
 * Sanity's free plan only allows PUBLIC datasets: anyone can query them without a token. Documents
 * whose _id contains a dot ("in a path") are the exception: only token-authenticated requests can
 * read them. Every non-catalog document (orders, users, addresses, reviews, contact messages,
 * subscribers, coupons, campaigns, audit log, payment settings…) must therefore be created with an
 * id from here. Never use the reserved "drafts." or "versions." prefixes.
 * https://www.sanity.io/docs/content-lake/ids
 */
export const PRIVATE_PREFIX = "private.";

/** A new private document id, e.g. "private.order.2f1c…". */
export function privateId(type: string): string {
  return `${PRIVATE_PREFIX}${type}.${randomUUID()}`;
}

export function isPrivateId(id: string | null | undefined): boolean {
  return typeof id === "string" && id.startsWith(PRIVATE_PREFIX);
}
