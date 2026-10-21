import "server-only";
import { NextResponse } from "next/server";

/**
 * Fixed-window rate limiting.
 *
 * - `limitRequest()` (async, preferred): counts in Upstash Redis when UPSTASH_REDIS_REST_URL and
 *   UPSTASH_REDIS_REST_TOKEN are set, so the limit holds across every server instance / serverless
 *   function. Without those variables (or if Redis can't be reached) it falls back to memory.
 * - `rateLimit()` (sync, legacy): in-memory only. Each server instance counts separately, which
 *   stops casual abuse but not a determined attacker spread across instances. Kept so existing
 *   callers keep working; switch them to `await limitRequest(...)`.
 *
 * Both take the same arguments. Pass the signed-in user's id as `identity` to count per account
 * instead of per IP address.
 */
type Options = { limit: number; windowMs: number };
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/**
 * Best guess at the caller's IP. Prefer headers set by the platform (Vercel sets x-real-ip and
 * x-vercel-forwarded-for and overwrites client-supplied values) over x-forwarded-for, whose first
 * entry can be forged by the client when no trusted proxy rewrites it.
 */
export function clientIp(req: Request): string {
  const h = req.headers;
  const first = (v: string | null) => v?.split(",")[0]?.trim() || "";
  return (
    first(h.get("x-real-ip")) ||
    first(h.get("x-vercel-forwarded-for")) ||
    first(h.get("x-forwarded-for")) ||
    "unknown"
  );
}

function bucketKey(req: Request, name: string, identity?: string | null): string {
  return identity ? `${name}:u:${identity}` : `${name}:ip:${clientIp(req)}`;
}

function tooMany(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please wait a moment and try again." },
    { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil(retryAfterSeconds))) } }
  );
}

function memoryHit(key: string, { limit, windowMs }: Options): NextResponse | null {
  const now = Date.now();
  if (buckets.size > 10_000) {
    for (const [k, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(k);
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  bucket.count += 1;
  if (bucket.count <= limit) return null;
  return tooMany((bucket.resetAt - now) / 1000);
}

function upstashConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  return url && token ? { url: url.replace(/\/+$/, ""), token } : null;
}

/** INCR + PEXPIRE in one pipeline call. Returns the window's count, or null if Redis failed. */
async function upstashIncr(key: string, windowMs: number): Promise<number | null> {
  const cfg = upstashConfig();
  if (!cfg) return null;
  try {
    const res = await fetch(`${cfg.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", key],
        ["PEXPIRE", key, String(windowMs)],
      ]),
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) throw new Error(`Upstash HTTP ${res.status}`);
    const data = (await res.json()) as Array<{ result?: unknown; error?: string }>;
    const count = Number(data?.[0]?.result);
    if (data?.[0]?.error || !Number.isFinite(count)) throw new Error(data?.[0]?.error || "bad reply");
    return count;
  } catch (error) {
    console.error("Rate limit store unavailable, using in-memory limits:", error);
    return null;
  }
}

/**
 * Returns a 429 response when the caller is over the limit, otherwise null.
 * Usage: `const limited = await limitRequest(req, "contact", { limit: 5, windowMs: 600_000 }); if (limited) return limited;`
 */
export async function limitRequest(
  req: Request,
  name: string,
  options: Options,
  identity?: string | null
): Promise<NextResponse | null> {
  const key = bucketKey(req, name, identity);
  if (upstashConfig()) {
    const now = Date.now();
    const window = Math.floor(now / options.windowMs);
    const count = await upstashIncr(`rl:${key}:${window}`, options.windowMs);
    if (count !== null) {
      if (count <= options.limit) return null;
      return tooMany(((window + 1) * options.windowMs - now) / 1000);
    }
  }
  return memoryHit(key, options);
}

/** Legacy synchronous, in-memory-only limiter. Prefer `await limitRequest(...)`. */
export function rateLimit(
  req: Request,
  name: string,
  options: Options,
  identity?: string | null
): NextResponse | null {
  return memoryHit(bucketKey(req, name, identity), options);
}
