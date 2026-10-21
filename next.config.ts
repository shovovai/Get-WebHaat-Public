import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Clerk's Frontend API host, read from the publishable key
 * (pk_live_<base64("clerk.example.com$")>). In production this is your custom
 * Clerk domain, e.g. clerk.example.com, which no wildcard below can cover.
 * Set NEXT_PUBLIC_CLERK_DOMAIN / NEXT_PUBLIC_CLERK_PROXY_URL if you use a
 * satellite domain or proxy instead.
 */
function clerkHosts(): string[] {
  const hosts: string[] = [];
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
  const encoded = key.split("_")[2];
  if (encoded) {
    try {
      const fapi = Buffer.from(encoded, "base64").toString("utf8").replace(/\$$/, "");
      if (/^[a-z0-9.-]+$/i.test(fapi)) hosts.push(`https://${fapi}`);
    } catch {
      /* malformed key: fall back to the wildcards */
    }
  }
  for (const value of [process.env.NEXT_PUBLIC_CLERK_DOMAIN, process.env.NEXT_PUBLIC_CLERK_PROXY_URL]) {
    if (!value) continue;
    try {
      hosts.push(new URL(value.includes("://") ? value : `https://${value}`).origin);
    } catch {
      /* ignore */
    }
  }
  return hosts;
}

// Vercel toolbar / comments on preview deployments only
const vercelLive = process.env.VERCEL_ENV === "preview" ? ["https://vercel.live"] : [];

const clerk = ["https://*.clerk.com", "https://*.clerk.accounts.dev", ...clerkHosts()];
const turnstile = ["https://challenges.cloudflare.com"]; // Clerk bot protection
const stripe = ["https://js.stripe.com"];
const google = ["https://www.googletagmanager.com", "https://*.googletagmanager.com", "https://www.google-analytics.com"];
const metaPixel = ["https://connect.facebook.net"];
const adsense = [
  "https://pagead2.googlesyndication.com",
  "https://*.googlesyndication.com",
  "https://*.adtrafficquality.google",
  "https://adservice.google.com",
  "https://www.googletagservices.com",
  "https://www.googleadservices.com",
  "https://googleads.g.doubleclick.net",
  "https://fundingchoicesmessages.google.com",
];

const unique = (list: string[]) => [...new Set(list)].join(" ");

// Hash-free, nonce-free policy: nonces would force every page to render
// dynamically and lose CDN caching, so inline scripts are allowed and the
// external hosts are pinned instead.
const csp = [
  "default-src 'self'",
  `script-src ${unique([
    "'self'",
    "'unsafe-inline'",
    ...(isDev ? ["'unsafe-eval'"] : []),
    ...clerk,
    ...turnstile,
    ...stripe,
    ...google,
    ...metaPixel,
    ...adsense,
    ...vercelLive,
  ])}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  `connect-src ${unique([
    "'self'",
    ...clerk,
    "https://clerk-telemetry.com",
    "https://api.stripe.com",
    "https://*.google-analytics.com",
    "https://*.analytics.google.com",
    "https://*.googletagmanager.com",
    "https://stats.g.doubleclick.net",
    "https://*.doubleclick.net",
    "https://www.google.com",
    "https://www.facebook.com",
    "https://connect.facebook.net",
    "https://pagead2.googlesyndication.com",
    "https://*.adtrafficquality.google",
    "https://fundingchoicesmessages.google.com",
    "https://*.api.sanity.io",
    "https://*.apicdn.sanity.io",
    ...vercelLive,
    ...(vercelLive.length ? ["wss://ws-us3.pusher.com"] : []),
  ])}`,
  `frame-src ${unique([
    "'self'",
    ...clerk,
    ...turnstile,
    ...stripe,
    "https://hooks.stripe.com",
    "https://checkout.stripe.com",
    "https://www.googletagmanager.com",
    "https://googleads.g.doubleclick.net",
    "https://*.doubleclick.net",
    "https://tpc.googlesyndication.com",
    "https://*.googlesyndication.com",
    "https://www.google.com",
    "https://fundingchoicesmessages.google.com",
    ...vercelLive,
  ])}`,
  "worker-src 'self' blob:",
  "media-src 'self' https:",
  "manifest-src 'self'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self' https:",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

// Sanity Studio loads its own assets and talks to *.api.sanity.io over
// https/wss; it keeps the earlier, looser policy.
const studioCsp = "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self' https:";

// Browser-side hardening sent with every response
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,

  // next/image resizes through Sanity's CDN (lib/sanityImageLoader.ts), never
  // Vercel Image Optimization. Other URLs pass through unchanged.
  images: {
    loader: "custom",
    loaderFile: "./lib/sanityImageLoader.ts",
  },

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Later entries override the same header key for matching paths
      { source: "/studio/:path*", headers: [{ key: "Content-Security-Policy", value: studioCsp }] },
    ];
  },
};

export default nextConfig;
