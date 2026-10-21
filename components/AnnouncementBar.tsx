import Link from "next/link";
import { getStoreSettings } from "@/lib/storeSettings";

// Storefront banner controlled from Admin → Settings → Announcement bar
export default async function AnnouncementBar() {
  const settings = await getStoreSettings();
  if (!settings.announcementEnabled || !settings.announcementText) return null;

  const link = settings.announcementLink;
  const safeLink = link && (link.startsWith("/") || /^https?:\/\//i.test(link)) ? link : "";

  return (
    <div
      className="px-4 py-2 text-center text-sm font-medium text-white"
      style={{ background: "#0a0a0a" }}
    >
      {safeLink ? (
        <Link href={safeLink} className="hover:underline">
          {settings.announcementText}
        </Link>
      ) : (
        settings.announcementText
      )}
    </div>
  );
}
