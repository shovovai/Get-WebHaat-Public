"use client";

import { FC } from "react";
import Link from "next/link";
import { ChevronRight, X } from "lucide-react";
import { ClerkLoaded, SignedIn, SignedOut } from "@clerk/nextjs";
import { useOutsideClick } from "@/hooks";
import Logo from "../common/Logo";
import SocialMedia from "../common/SocialMedia";
import type { NavCategory } from "../ClientHeader";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  categories?: NavCategory[];
}

const shopLinks = [
  { title: "New In", href: "/shop" },
  { title: "All categories", href: "/category" },
  { title: "Sale", href: "/deal" },
  { title: "Brands", href: "/brands" },
  { title: "Journal", href: "/blog" },
];

const helpLinks = [
  { title: "Help center", href: "/help" },
  { title: "Track my order", href: "/user/orders" },
  { title: "Contact us", href: "/contact" },
  { title: "About us", href: "/about" },
];

/** Phone navigation drawer */
const Sidebar: FC<SidebarProps> = ({ isOpen, onClose, categories = [] }) => {
  const panelRef = useOutsideClick<HTMLDivElement>(onClose);

  const row = (href: string, title: string, emphasis = false) => (
    <Link
      key={href + title}
      href={href}
      onClick={onClose}
      className={cn(
        "flex items-center justify-between border-b border-black/[0.06] py-4 text-[17px]",
        emphasis ? "font-medium text-ink" : "text-ink/80",
        title === "Sale" && "text-sale"
      )}
    >
      {title}
      <ChevronRight className="h-4 w-4 text-ink/40" />
    </Link>
  );

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-black/40 transition-opacity duration-300",
        isOpen ? "opacity-100" : "pointer-events-none opacity-0"
      )}
      aria-hidden={!isOpen}
    >
      <div
        ref={panelRef}
        className={cn(
          "flex h-full w-[86%] max-w-sm flex-col bg-white transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-black/[0.06] px-5">
          <Logo />
          <button type="button" onClick={onClose} className="-mr-2 p-2" aria-label="Close menu">
            <X className="h-6 w-6" strokeWidth={1.6} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-8">
          {categories.length > 0 && (
            <section className="pt-4">
              <p className="pb-1 text-[11px] font-medium uppercase tracking-[0.25em] text-light-color">
                Shop by category
              </p>
              {categories.map((c) => row(`/category/${c.slug}`, c.title, true))}
            </section>
          )}

          <section className="pt-6">
            <p className="pb-1 text-[11px] font-medium uppercase tracking-[0.25em] text-light-color">Shop</p>
            {shopLinks.map((l) => row(l.href, l.title, categories.length === 0))}
          </section>

          <section className="pt-6">
            <p className="pb-1 text-[11px] font-medium uppercase tracking-[0.25em] text-light-color">
              Account
            </p>
            <ClerkLoaded>
              <SignedIn>
                {row("/user/dashboard", "My account")}
                {row("/user/orders", "My orders")}
              </SignedIn>
              <SignedOut>
                {row("/sign-in", "Sign in")}
                {row("/sign-up", "Create account")}
              </SignedOut>
            </ClerkLoaded>
            {row("/wishlist", "Wishlist")}
            {row("/cart", "Shopping bag")}
          </section>

          <section className="pt-6">
            <p className="pb-1 text-[11px] font-medium uppercase tracking-[0.25em] text-light-color">Help</p>
            {helpLinks.map((l) => row(l.href, l.title))}
          </section>

          <div className="pt-8">
            <SocialMedia
              className="text-ink"
              iconClassName="border-black/15 hover:bg-ink hover:text-white"
              tooltipClassName="bg-ink text-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
