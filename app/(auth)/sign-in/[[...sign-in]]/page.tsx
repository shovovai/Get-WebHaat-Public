"use client";

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AuthLayout, { clerkAppearance } from "@/components/auth/AuthLayout";
import { safeRedirectPath } from "@/lib/safeRedirect";

export default function SignInPage() {
  const searchParams = useSearchParams();
  // Same-site paths only (blocks ?redirectTo=https://evil.example)
  const redirectTo = safeRedirectPath(searchParams.get("redirectTo"), "") || null;
  const signUpUrl = `/sign-up${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`;

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Track orders, save your wishlist and check out faster."
      footer={
        <>
          By continuing you agree to our <Link href="/terms" className="text-ink underline underline-offset-4">Terms</Link> and{" "}
          <Link href="/privacy" className="text-ink underline underline-offset-4">Privacy policy</Link>.
        </>
      }
    >
      <SignIn
        appearance={clerkAppearance}
        signUpUrl={signUpUrl}
        forceRedirectUrl={redirectTo || "/user/dashboard"}
        fallbackRedirectUrl={redirectTo || "/user/dashboard"}
      />
    </AuthLayout>
  );
}
