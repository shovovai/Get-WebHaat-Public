"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import {
  BarChart3,
  Bell,
  ExternalLink,
  FileBarChart,
  Globe,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Package,
  Settings,
  Shield,
  ShoppingCart,
  Star,
  TicketPercent,
  UserCheck,
  Users,
  UsersRound,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badgeKey?: "accountRequests" | "payments";
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
      { label: "Reports & Export", href: "/admin/reports", icon: FileBarChart },
    ],
  },
  {
    title: "Store",
    items: [
      { label: "Orders", href: "/admin/orders", icon: ShoppingCart },
      { label: "Payments", href: "/admin/payments", icon: Wallet, badgeKey: "payments" },
      { label: "Products", href: "/admin/products", icon: Package },
      { label: "Reviews", href: "/admin/reviews", icon: Star },
      { label: "Coupons", href: "/admin/coupons", icon: TicketPercent },
    ],
  },
  {
    title: "Customers",
    items: [
      { label: "Users", href: "/admin/users", icon: Users },
      {
        label: "Account Requests",
        href: "/admin/account-requests",
        icon: UserCheck,
        badgeKey: "accountRequests",
      },
      { label: "Email Marketing", href: "/admin/subscriptions", icon: Mail },
      { label: "Notifications", href: "/admin/notifications", icon: Bell },
    ],
  },
  {
    title: "Team & System",
    items: [
      { label: "Employees", href: "/admin/employees", icon: UsersRound },
      { label: "SEO & Branding", href: "/admin/seo", icon: Globe },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

interface AdminShellProps {
  children: ReactNode;
  settings: {
    adminPanelTitle: string;
    adminLogoUrl: string;
    accentColor: string;
    storeName: string;
  };
  user: { name: string; email: string; imageUrl?: string };
}

export default function AdminShell({ children, settings, user }: AdminShellProps) {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [badges, setBadges] = useState<{ accountRequests?: number; payments?: number }>({});

  // Close the mobile drawer on navigation
  useEffect(() => setMobileOpen(false), [pathname]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/account-requests-summary", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.success) {
          setBadges((b) => ({ ...b, accountRequests: data.totalPendingRequests }));
        }
      })
      .catch(() => {});
    fetch("/api/admin/payments/verifications?status=awaiting", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.success) setBadges((b) => ({ ...b, payments: data.awaitingCount }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const current = ALL_ITEMS.find((item) => isActive(pathname, item.href));

  const sidebar = (
    <div className="flex h-full flex-col bg-gradient-to-b from-[#1c1c1e] to-black text-white">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        {settings.adminLogoUrl ? (
          <img
            src={settings.adminLogoUrl}
            alt={settings.adminPanelTitle}
            className="h-10 w-10 rounded-md bg-white object-contain p-1"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-black">
            <Shield className="h-5 w-5" strokeWidth={1.6} />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-[15px] font-medium text-white">{settings.adminPanelTitle}</p>
          <p className="truncate text-xs text-white/50">{settings.storeName}</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="mb-6">
            <p className="mb-2 px-3 text-[11px] tracking-[0.3em] text-white/40">{group.title}</p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                const badge = item.badgeKey ? badges[item.badgeKey] : undefined;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2.5 text-[15px] transition-colors",
                        active ? "bg-white text-black" : "text-white/70 hover:bg-white/[0.08] hover:text-white"
                      )}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.6} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {!!badge && (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            active ? "bg-black text-white" : "bg-sale text-white"
                          )}
                        >
                          {badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-[15px] text-white/70 hover:bg-white/[0.08] hover:text-white"
        >
          <ExternalLink className="h-[18px] w-[18px]" strokeWidth={1.6} />
          View store
        </Link>
        <Link
          href="/studio"
          target="_blank"
          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-[15px] text-white/70 hover:bg-white/[0.08] hover:text-white"
        >
          <Package className="h-[18px] w-[18px]" strokeWidth={1.6} />
          Content studio
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] shadow-xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-5 z-10 rounded-md p-1 text-white/70 hover:bg-white/10"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-black/[0.06] bg-white/95 px-4 backdrop-blur sm:px-8">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="flex-1 truncate text-xl text-ink">
            {current?.label ?? "Admin"}
          </h1>
          <Link
            href="/admin/notifications"
            className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </Link>
          <div className="hidden items-center gap-3 sm:flex">
            {user.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={user.name}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-sm font-medium text-white">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="hidden text-right md:block">
              <p className="text-sm font-medium leading-tight text-gray-900">
                {user.name}
              </p>
              <p className="text-xs leading-tight text-gray-500">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ redirectUrl: "/" })}
            className="flex items-center gap-2 rounded-md border border-black/15 px-3 py-2 text-sm text-ink hover:border-ink"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </header>

        <main className="p-4 sm:p-8">
          <div className="overflow-hidden rounded-xl bg-white">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
