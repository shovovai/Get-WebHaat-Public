import "server-only";
import { NextResponse } from "next/server";
import { auth, clerkClient, currentUser, type User } from "@clerk/nextjs/server";
import { isUserAdmin } from "@/lib/adminUtils";

type AdminCheck =
  | { ok: true; userId: string; email: string }
  | { ok: false; response: NextResponse };

/**
 * The user's primary email, only if Clerk has verified it.
 * Admin rights are tied to an email, so an unverified address must never count.
 */
export function verifiedPrimaryEmail(user: User | null | undefined): string | null {
  const primary = user?.primaryEmailAddress;
  if (!primary?.emailAddress || primary.verification?.status !== "verified") return null;
  return primary.emailAddress.toLowerCase();
}

/** Verified primary email of the signed-in user, or null */
export async function getCurrentUserEmail(): Promise<string | null> {
  return verifiedPrimaryEmail(await currentUser());
}

/** Admin check by Clerk user id (used by the proxy) */
export async function isAdminUserId(userId: string): Promise<boolean> {
  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  return isUserAdmin(verifiedPrimaryEmail(user));
}

/**
 * Server-side guard for admin API routes.
 * Usage:
 *   const admin = await requireAdmin();
 *   if (!admin.ok) return admin.response;
 */
export async function requireAdmin(): Promise<AdminCheck> {
  const { userId } = await auth();

  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Unauthorized", message: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  const clerk = await clerkClient();
  const email = verifiedPrimaryEmail(await clerk.users.getUser(userId));

  if (!email || !isUserAdmin(email)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          error: "Forbidden - Admin access required",
          message: "Forbidden - Admin access required",
        },
        { status: 403 }
      ),
    };
  }

  return { ok: true, userId, email };
}

/** Returns the admin email or null — for server components, layouts and server actions. */
export async function getAdminEmail(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const clerk = await clerkClient();
  const email = verifiedPrimaryEmail(await clerk.users.getUser(userId));
  return email && isUserAdmin(email) ? email : null;
}
