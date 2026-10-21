"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { safeRedirectPath } from "@/lib/safeRedirect";

/**
 * Back to where the customer was after signing in (?redirectTo=…).
 * Kept apart from the header and rendered in its own <Suspense> so reading
 * search params doesn't turn the whole header into client-only rendering.
 */
export default function SignInRedirect() {
  const { user, isSignedIn } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isSignedIn || !user) return;
    const redirectTo = searchParams.get("redirectTo");
    if (redirectTo) router.replace(safeRedirectPath(redirectTo));
  }, [isSignedIn, user, searchParams, router]);

  return null;
}
