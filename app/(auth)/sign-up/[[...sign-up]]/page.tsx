"use client";

import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AuthLayout, { clerkAppearance } from "@/components/auth/AuthLayout";
import { safeRedirectPath } from "@/lib/safeRedirect";

export default function SignUpPage() {
  const searchParams = useSearchParams();
  // Same-site paths only (blocks ?redirectTo=https://evil.example)
  const redirectTo = safeRedirectPath(searchParams.get("redirectTo"), "") || null;
  const signInUrl = `/sign-in${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`;

  return (
    <AuthLayout
      title="Create account"
      subtitle="Join to track orders, save favourites and get members-only offers."
      footer={
        <>
          By creating an account you agree to our{" "}
          <Link href="/terms" className="text-ink underline underline-offset-4">Terms</Link> and{" "}
          <Link href="/privacy" className="text-ink underline underline-offset-4">Privacy policy</Link>.
        </>
      }
    >
      <SignUp
        appearance={clerkAppearance}
        signInUrl={signInUrl}
        forceRedirectUrl={redirectTo || "/user/dashboard"}
        fallbackRedirectUrl={redirectTo || "/user/dashboard"}
      />
    </AuthLayout>
  );
}
