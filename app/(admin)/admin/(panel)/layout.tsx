import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { isUserAdmin } from "@/lib/adminUtils";
import { verifiedPrimaryEmail } from "@/lib/adminAuth";
import { getStoreSettings } from "@/lib/storeSettings";
import AdminShell from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/admin");

  const user = await currentUser();
  const email = verifiedPrimaryEmail(user);
  if (!email || !isUserAdmin(email)) redirect("/admin/access-denied");

  const settings = await getStoreSettings();

  return (
    <AdminShell
      settings={{
        adminPanelTitle: settings.adminPanelTitle,
        adminLogoUrl: settings.adminLogoUrl,
        accentColor: settings.accentColor,
        storeName: settings.storeName,
      }}
      user={{
        name: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || email,
        email,
        imageUrl: user?.imageUrl,
      }}
    >
      {children}
    </AdminShell>
  );
}
