import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isAdminUserId } from "@/lib/adminAuth";

const isProtectedRoute = createRouteMatcher([
  "/user(.*)",
  "/cart(.*)",
  "/wishlist(.*)",
  "/success(.*)",
  "/checkout(.*)",
  "/settings(.*)",
  "/admin(.*)",
  "/employee(.*)",
  "/studio(.*)",
]);

// Admin-only areas. Each route also checks on its own; this is a second lock.
const isAdminArea = createRouteMatcher([
  "/admin(.*)",
  "/studio(.*)",
  "/api/admin(.*)",
  "/api/analytics(.*)",
]);
const isAccessDenied = createRouteMatcher(["/admin/access-denied"]);

// Short cache so admin pages don't call Clerk on every request
const ADMIN_CACHE_MS = 60_000;
const adminCache = new Map<string, { admin: boolean; at: number }>();

async function cachedIsAdmin(userId: string): Promise<boolean> {
  const hit = adminCache.get(userId);
  if (hit && Date.now() - hit.at < ADMIN_CACHE_MS) return hit.admin;
  const admin = await isAdminUserId(userId).catch(() => false);
  if (adminCache.size > 500) adminCache.clear();
  adminCache.set(userId, { admin, at: Date.now() });
  return admin;
}

export default clerkMiddleware(async (auth, req) => {
  const isApi = req.nextUrl.pathname.startsWith("/api/");

  if (isAdminArea(req) && !isAccessDenied(req)) {
    const { userId } = await auth();
    if (!userId) {
      if (isApi) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const signIn = new URL("/sign-in", req.url);
      signIn.searchParams.set("redirectTo", req.nextUrl.pathname);
      return NextResponse.redirect(signIn);
    }
    if (!(await cachedIsAdmin(userId))) {
      if (isApi) {
        return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/admin/access-denied", req.url));
    }
    return;
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

// Clerk only runs where it is needed: signed-in areas, auth pages, the API and
// server-action POSTs. Public catalog pages (/, /shop, /product/*, /category/*,
// /brands/*, /deal, /blog/*, info pages) skip the proxy entirely so they are
// served straight from the CDN cache without a function invocation. Client-side
// Clerk (useUser, <SignedIn>) works without it; server-side auth() /
// currentUser() is only called under the paths below.
export const config = {
  matcher: [
    "/user/:path*",
    "/cart/:path*",
    "/wishlist/:path*",
    "/success/:path*",
    "/checkout/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/employee/:path*",
    "/studio/:path*",
    "/sign-in/:path*",
    "/sign-up/:path*",
    "/dashboard/:path*",
    "/orders/:path*",
    // All API routes except the CDN-cached catalog search and the Sanity
    // webhook, which never call auth()
    "/api/((?!catalog(?:/|$)|revalidate(?:/|$)).*)",
    // Server actions may call auth() from any page (they POST to the page URL)
    {
      source: "/((?!_next|api).*)",
      has: [{ type: "header", key: "next-action" }],
    },
  ],
};
