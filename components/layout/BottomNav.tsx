"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Heart, Home, LayoutGrid, ShoppingBag, UserRound, type LucideIcon } from "lucide-react";
import useCartStore from "@/store";
import { cn } from "@/lib/utils";

/** Opens the global search window (listened to by SearchBar) */
export const openSearch = () => window.dispatchEvent(new Event("open-search"));

interface Item {
  label: string;
  icon: LucideIcon;
  href: string;
  match: (path: string) => boolean;
  badge?: number;
}

/** Tab bar for phones and tablets (hidden on desktop) */
export default function BottomNav() {
  const pathname = usePathname();
  const { isSignedIn } = useUser();
  const items = useCartStore((s) => s.items);
  const favorites = useCartStore((s) => s.favoriteProduct);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const bagCount = mounted ? items.reduce((n, i) => n + i.quantity, 0) : 0;

  // Product pages show their own "Add to bag" bar here instead
  if (pathname.startsWith("/product/")) return null;
  const favCount = mounted ? favorites.length : 0;

  const nav: Item[] = [
    { label: "Home", icon: Home, href: "/", match: (p) => p === "/" },
    {
      label: "Shop",
      icon: LayoutGrid,
      href: "/shop",
      match: (p) => ["/shop", "/category", "/brands", "/deal"].some((x) => p.startsWith(x)),
    },
    { label: "Wishlist", icon: Heart, href: "/wishlist", match: (p) => p.startsWith("/wishlist"), badge: favCount },
    { label: "Bag", icon: ShoppingBag, href: "/cart", match: (p) => p.startsWith("/cart") || p.startsWith("/checkout"), badge: bagCount },
    {
      label: "Account",
      icon: UserRound,
      href: isSignedIn ? "/user/dashboard" : "/sign-in",
      match: (p) => p.startsWith("/user") || p.startsWith("/sign-in"),
    },
  ];

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.08] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-xl grid-cols-5">
        {nav.map(({ label, icon: Icon, href, match, badge }) => {
          const active = match(pathname);
          return (
            <li key={label}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-[11px] transition-colors",
                  active ? "font-medium text-ink" : "text-light-color"
                )}
              >
                <span className="relative">
                  <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2 : 1.6} />
                  {!!badge && (
                    <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[10px] font-semibold text-white">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
