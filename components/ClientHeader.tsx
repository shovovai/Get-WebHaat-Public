"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Heart, Mail, Phone, Truck } from "lucide-react";
import Container from "./Container";
import Logo from "./common/Logo";
import MobileMenu from "./layout/MobileMenu";
import SearchBar from "./common/SearchBar";
import AccountMenu from "./header/AccountMenu";
import MiniBag from "./header/MiniBag";
import MegaMenu from "./header/MegaMenu";
import SignInRedirect from "./header/SignInRedirect";
import type { MenuSection } from "@/lib/menuData";
import useCartStore from "@/store";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { formatPrice } from "@/lib/storeConfig";
import { cn } from "@/lib/utils";

export interface NavCategory {
  title: string;
  slug: string;
}

interface NavItem {
  title: string;
  href: string;
  /** Mega-menu section opened on hover */
  menu?: string;
  sale?: boolean;
}

const ClientHeader = ({ categories, sections = [] }: { categories: NavCategory[]; sections?: MenuSection[] }) => {
  const pathname = usePathname();
  const { supportEmail, deliveryCharge, freeDeliveryOver } = useSiteSettings();
  const favorites = useCartStore((s) => s.favoriteProduct);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuKey, setMenuKey] = useState<string | null>(null);
  const [primed, setPrimed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Warm the mega-menu photos the first time the pointer reaches the header
  useEffect(() => {
    if (!primed) return;
    for (const s of sections) for (const t of s.tiles) new Image().src = t.image;
  }, [primed, sections]);

  // Close the mega menu on navigation
  useEffect(() => setMenuKey(null), [pathname]);

  const hasSection = (key: string) => sections.some((s) => s.key === key);
  const items: NavItem[] =
    categories.length > 0
      ? [
          { title: "New In", href: "/shop", menu: "new" },
          ...categories.map((c) => ({ title: c.title, href: `/category/${c.slug}`, menu: `cat:${c.slug}` })),
          { title: "Sale", href: "/deal", menu: "sale", sale: true },
        ]
      : [
          { title: "New In", href: "/shop", menu: "new" },
          { title: "Categories", href: "/category" },
          { title: "Sale", href: "/deal", menu: "sale", sale: true },
          { title: "Brands", href: "/brands" },
          { title: "Journal", href: "/blog" },
          { title: "About", href: "/about" },
          { title: "Contact", href: "/contact" },
        ];

  const openMenu = (key?: string) => {
    if (timer.current) clearTimeout(timer.current);
    if (!key || !hasSection(key)) {
      timer.current = setTimeout(() => setMenuKey(null), 120);
      return;
    }
    timer.current = setTimeout(() => setMenuKey(key), menuKey ? 0 : 140);
  };
  const closeMenu = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMenuKey(null), 180);
  };

  const deliveryNote =
    deliveryCharge <= 0
      ? "Free delivery on every order"
      : freeDeliveryOver > 0
        ? `Free delivery over ${formatPrice(freeDeliveryOver)}`
        : "Fast, tracked delivery";

  const favCount = mounted ? favorites.length : 0;

  return (
    <>
      {/* Own boundary: useSearchParams would otherwise make the whole header client-only on static pages */}
      <Suspense fallback={null}>
        <SignInRedirect />
      </Suspense>
      <header
        onMouseEnter={() => setPrimed(true)}
        onMouseLeave={closeMenu}
        className={cn(
          "sticky top-0 z-40 bg-white transition-shadow",
          scrolled || menuKey ? "shadow-[0_1px_0_rgba(0,0,0,0.08)]" : "border-b border-black/[0.06]"
        )}
      >
        {/* Utility bar (desktop) */}
        <div className={cn("hidden border-b border-black/[0.06] lg:block", scrolled && "lg:hidden")}>
          <Container className="flex h-10 items-center justify-between text-[13px] text-ink">
            <div className="flex items-center gap-7">
              <a href={`mailto:${supportEmail}`} className="flex items-center gap-2 hover:underline">
                <Mail className="h-4 w-4" strokeWidth={1.6} />
                {supportEmail}
              </a>
              <Link href="/contact" className="flex items-center gap-2 hover:underline">
                <Phone className="h-4 w-4" strokeWidth={1.6} />
                Contact
              </Link>
            </div>
            <div className="flex items-center gap-7">
              <span className="flex items-center gap-2 text-light-color">
                <Truck className="h-4 w-4" strokeWidth={1.6} />
                {deliveryNote}
              </span>
              <Link href="/user/orders" className="hover:underline">
                Track order
              </Link>
              <Link href="/help" className="hover:underline">
                Help
              </Link>
            </div>
          </Container>
        </div>

        {/* Main bar */}
        <Container>
          <div className="grid h-16 grid-cols-[1fr_auto_1fr] items-center lg:flex lg:h-[4.75rem] lg:gap-10">
            <div className="flex items-center lg:shrink-0">
              <MobileMenu categories={categories} />
              <div className="hidden lg:block" onMouseEnter={() => openMenu()}>
                <Logo />
              </div>
            </div>

            <div className="lg:hidden">
              <Logo />
            </div>

            {/* Navigation (desktop) */}
            <nav aria-label="Main" className="hidden h-full min-w-0 flex-1 lg:block">
              <ul className="flex h-full items-center gap-8 overflow-x-auto text-[15px] scrollbar-hide">
                {items.map((item) => {
                  const active = item.href === "/shop" ? pathname === "/shop" : pathname.startsWith(item.href);
                  const open = item.menu && menuKey === item.menu;
                  return (
                    <li key={item.href + item.title} className="flex h-full shrink-0 items-center">
                      <Link
                        href={item.href}
                        onMouseEnter={() => openMenu(item.menu)}
                        onFocus={() => openMenu(item.menu)}
                        aria-expanded={item.menu ? Boolean(open) : undefined}
                        className={cn(
                          "relative whitespace-nowrap py-2 transition-colors",
                          "after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-300 hover:after:scale-x-100",
                          (active || open) && "after:scale-x-100",
                          item.sale ? "text-sale" : "text-ink"
                        )}
                      >
                        {item.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Actions */}
            <div className="flex items-center justify-end gap-0.5 lg:shrink-0" onMouseEnter={() => openMenu()}>
              <SearchBar variant="icon" />
              <div className="hidden lg:block">
                <AccountMenu />
              </div>
              <Link
                href="/wishlist"
                className="group relative hidden h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-sand lg:flex"
                aria-label={`Wishlist${favCount ? `, ${favCount} items` : ""}`}
              >
                <Heart className="h-[22px] w-[22px]" strokeWidth={1.6} />
                {favCount > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[10px] font-semibold text-white">
                    {favCount > 9 ? "9+" : favCount}
                  </span>
                )}
                <span className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2.5 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                  Wishlist
                </span>
              </Link>
              <div className="hidden lg:block">
                <MiniBag />
              </div>
            </div>
          </div>
        </Container>

        {/* Mega menu (desktop) */}
        <div
          className={cn(
            "absolute inset-x-0 top-full hidden transition-all duration-200 lg:block",
            menuKey ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0"
          )}
          onMouseEnter={() => timer.current && clearTimeout(timer.current)}
        >
          {menuKey && (
            <MegaMenu
              sections={sections}
              activeKey={menuKey}
              onActivate={(k) => setMenuKey(k)}
              onNavigate={() => setMenuKey(null)}
            />
          )}
        </div>
      </header>

      {/* Dim the page while the mega menu is open */}
      <div
        aria-hidden
        onMouseEnter={closeMenu}
        className={cn(
          "fixed inset-0 z-30 hidden bg-black/40 transition-opacity duration-200 lg:block",
          menuKey ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />
    </>
  );
};

export default ClientHeader;
