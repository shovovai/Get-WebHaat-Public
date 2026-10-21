"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useUserData } from "@/contexts/UserDataContext";

export default function NotificationBell() {
  const { isSignedIn } = useUser();
  const { unreadNotifications } = useUserData();

  if (!isSignedIn) {
    return null;
  }

  const displayCount = unreadNotifications > 9 ? "9+" : unreadNotifications;

  return (
    <Link href="/user/notifications" className="relative">
      <Bell className="text-shop_dark_green/80 group-hover:text-shop_dark_green hoverEffect" />
      {unreadNotifications > 0 ? (
        <span
          className={`absolute -top-1 -right-1 bg-clay text-white rounded-full text-[10px] ring-2 ring-cream font-semibold flex items-center justify-center min-w-[16px] h-[16px] ${
            unreadNotifications > 9 ? "px-1" : ""
          }`}
        >
          {displayCount}
        </span>
      ) : (
        <span
          className={`absolute -top-1 -right-1 bg-clay text-white rounded-full text-[10px] ring-2 ring-cream font-semibold flex items-center justify-center min-w-[16px] h-[16px]`}
        >
          0
        </span>
      )}
    </Link>
  );
}
