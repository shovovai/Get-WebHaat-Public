import { Metadata } from "next";
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { isUserAdmin } from "@/lib/adminUtils";
import { verifiedPrimaryEmail } from "@/lib/adminAuth";
import { brand } from "@/config/brand";

export const metadata: Metadata = {
  title: `${brand.name} Content Studio`,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// Only store admins (NEXT_PUBLIC_ADMIN_EMAIL) may open the Sanity Studio
export default async function StudioLayout({ children }: { children: ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/studio");

  const user = await currentUser();
  if (!isUserAdmin(verifiedPrimaryEmail(user))) {
    redirect("/admin/access-denied");
  }

  return <>{children}</>;
}
