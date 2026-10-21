"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import {
  Bell,
  Building2,
  Heart,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  Shield,
  User,
  Users,
} from "lucide-react";
import Container from "@/components/Container";
import { isUserAdmin } from "@/lib/adminUtils";
import { cn } from "@/lib/utils";

const accountItems = [
  { title: "Dashboard", href: "/user/dashboard", icon: LayoutDashboard },
  { title: "My orders", href: "/user/orders", icon: Package },
  { title: "Profile", href: "/user/profile", icon: User },
  { title: "Notifications", href: "/user/notifications", icon: Bell },
  { title: "Wishlist", href: "/wishlist", icon: Heart },
  { title: "Settings", href: "/user/settings", icon: Settings },
];

const adminItems = [
  { title: "Manage users", href: "/user/admin/manage-users", icon: Users },
  { title: "Premium accounts", href: "/user/admin/premium-accounts", icon: Shield },
  { title: "Business accounts", href: "/user/admin/business-accounts", icon: Building2 },
];

/** Account area: side menu card (desktop) / scrolling tabs (phones) + page content */
export default function UserLayout({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const pathname = usePathname();
  const isAdminUser = isUserAdmin(user?.primaryEmailAddress?.emailAddress);
  const items = isAdminUser ? [...accountItems, ...adminItems] : accountItems;
  const isActive = (href: string) => pathname === href || (href !== "/user/dashboard" && pathname.startsWith(href));

  return (
    <Container className="py-8 lg:py-12">
      <div className="mb-8 flex items-center gap-4">
        {user?.imageUrl ? (
          <img src={user.imageUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white">
            <User className="h-6 w-6" strokeWidth={1.6} />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm text-light-color">Welcome back</p>
          <h1 className="truncate text-[26px] leading-tight text-ink sm:text-[32px]">
            {[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "My account"}
          </h1>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[296px_minmax(0,1fr)] lg:gap-12">
        <nav aria-label="Account" className="-mx-4 overflow-x-auto px-4 scrollbar-hide lg:mx-0 lg:overflow-visible lg:px-0">
          <div className="lg:sticky lg:top-28 lg:rounded-xl lg:border lg:border-black/15 lg:p-6">
            <ul className="flex gap-2 lg:flex-col lg:gap-1">
              {items.map(({ title, href, icon: Icon }, i) => {
                const on = isActive(href);
                return (
                  <li key={href} className={cn("shrink-0", i === accountItems.length && "lg:mt-4 lg:border-t lg:border-black/10 lg:pt-4")}>
                    <Link
                      href={href}
                      aria-current={on ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 whitespace-nowrap rounded-full px-4 py-2 text-[15px] transition-colors lg:rounded-md lg:py-3 lg:text-base",
                        on ? "bg-ink text-white" : "bg-white text-light-color hover:text-ink lg:bg-transparent"
                      )}
                    >
                      <Icon className="hidden h-[18px] w-[18px] lg:block" strokeWidth={1.6} />
                      {title}
                    </Link>
                  </li>
                );
              })}
              <li className="shrink-0 lg:mt-4 lg:border-t lg:border-black/10 lg:pt-4">
                <button
                  type="button"
                  onClick={() => signOut({ redirectUrl: "/" })}
                  className="flex w-full items-center gap-3 whitespace-nowrap rounded-full bg-white px-4 py-2 text-[15px] text-light-color hover:text-ink lg:rounded-md lg:bg-transparent lg:py-3 lg:text-base"
                >
                  <LogOut className="hidden h-[18px] w-[18px] lg:block" strokeWidth={1.6} />
                  Sign out
                </button>
              </li>
            </ul>
          </div>
        </nav>

        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  );
}
