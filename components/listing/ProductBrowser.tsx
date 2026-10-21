"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SlidersHorizontal, X } from "lucide-react";
import type { Product } from "@/sanity.types";
import { formatPrice, storeConfig } from "@/lib/storeConfig";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { cn } from "@/lib/utils";
import Container from "../Container";
import ProductCard from "../ProductCard";
import FilterDropdown, { type Option } from "./FilterDropdown";

export interface Crumb {
  label: string;
  href?: string;
}

export interface SubNavItem {
  title: string;
  href: string;
  active?: boolean;
}

interface Props {
  title: string;
  description?: string | null;
  breadcrumb: Crumb[];
  products: Product[];
  subnav?: SubNavItem[];
  /** Text of the black promo bar (defaults to the delivery offer) */
  promo?: string | null;
  emptyText?: string;
}

type Sort = "default" | "newest" | "price-asc" | "price-desc" | "discount" | "name";

const SORTS: Option[] = [
  { label: "Default", value: "default" },
  { label: "Newest", value: "newest" },
  { label: "Price: low to high", value: "price-asc" },
  { label: "Price: high to low", value: "price-desc" },
  { label: "Biggest discount", value: "discount" },
  { label: "Name A–Z", value: "name" },
];

const buckets = storeConfig.priceBuckets;
const short = (n: number) => formatPrice(n).replace(/\.00$/, "");
const PRICES: Option[] = [
  { label: `Under ${short(buckets[0])}`, value: `0-${buckets[0]}` },
  ...buckets.slice(1).map((b, i) => ({ label: `${short(buckets[i])} – ${short(b)}`, value: `${buckets[i]}-${b}` })),
  { label: `Over ${short(buckets[buckets.length - 1])}`, value: `${buckets[buckets.length - 1]}-1000000000` },
];

const AVAILABILITY: Option[] = [
  { label: "In stock", value: "in-stock" },
  { label: "On sale", value: "sale" },
];

const validDiscount = (p: Product) => (p.discount && p.discount > 0 && p.discount < 100 ? p.discount : 0);

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 text-[15px] text-light-color">
        {items.map((c, i) => (
          <li key={c.label + i} className="flex items-center gap-2">
            {c.href ? (
              <Link href={c.href} className="text-ink underline underline-offset-4 hover:text-light-color">
                {c.label}
              </Link>
            ) : (
              <span>{c.label}</span>
            )}
            {i < items.length - 1 && <span aria-hidden>/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function SubNav({ items }: { items: SubNavItem[] }) {
  if (items.length < 2) return null;
  return (
    <div className="border-b border-black/[0.06] bg-white">
      <Container>
        <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 py-2.5 scrollbar-hide sm:justify-center">
          {items.map((item) => (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                className={cn(
                  "block rounded-full px-5 py-2 text-[15px] transition-colors",
                  item.active ? "bg-ink text-white" : "text-ink hover:bg-sand"
                )}
              >
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </div>
  );
}

/** Listing page: sub-navigation, breadcrumb, filter/sort bar, promo bar and product grid */
export default function ProductBrowser({ title, description, breadcrumb, products, subnav, promo, emptyText }: Props) {
  const { deliveryCharge, freeDeliveryOver } = useSiteSettings();
  const [sort, setSort] = useState<Sort>("default");
  const [price, setPrice] = useState<string | null>(null);
  const [availability, setAvailability] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const visible = useMemo(() => {
    let list = [...products];
    if (price) {
      const [min, max] = price.split("-").map(Number);
      list = list.filter((p) => (p.price ?? 0) >= min && (p.price ?? 0) <= max);
    }
    if (availability === "in-stock") list = list.filter((p) => (p.stock ?? 0) > 0);
    if (availability === "sale") list = list.filter((p) => validDiscount(p) > 0 || p.status === "sale");
    switch (sort) {
      case "newest":
        list.sort((a, b) => (b._createdAt || "").localeCompare(a._createdAt || ""));
        break;
      case "price-asc":
        list.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
        break;
      case "price-desc":
        list.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
        break;
      case "discount":
        list.sort((a, b) => validDiscount(b) - validDiscount(a));
        break;
      case "name":
        list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        break;
    }
    return list;
  }, [products, sort, price, availability]);

  const filtered = Boolean(price || availability);
  const promoText =
    promo ??
    (deliveryCharge <= 0
      ? "Free delivery on every order"
      : freeDeliveryOver > 0
        ? `Free delivery on orders over ${short(freeDeliveryOver)}`
        : "Cash on delivery available — pay when your order arrives");

  const filterControls = (stacked: boolean) => (
    <div className={cn("flex gap-3", stacked ? "flex-col" : "items-center")}>
      <FilterDropdown label="Price" options={PRICES} value={price} onChange={setPrice} />
      <FilterDropdown label="Availability" options={AVAILABILITY} value={availability} onChange={setAvailability} />
    </div>
  );

  return (
    <>
      {subnav && <SubNav items={subnav} />}

      {/* Toolbar */}
      <div className="sticky top-16 z-20 border-b border-black/[0.06] bg-cream/95 backdrop-blur lg:top-[4.75rem]">
        <Container className="flex h-16 items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="hidden sm:block">
              <Breadcrumbs items={breadcrumb} />
            </div>
            <p className="text-[15px] text-ink sm:hidden">
              {visible.length} item{visible.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="hidden items-center gap-3 lg:flex">
            {filterControls(false)}
            <div className="ml-5">
              <FilterDropdown
                label="Sort"
                options={SORTS}
                value={sort}
                onChange={(v) => setSort((v as Sort) || "default")}
                showValue
                align="right"
                allowClear={false}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="relative flex h-10 w-10 items-center justify-center lg:hidden"
            aria-label="Filter and sort"
          >
            <SlidersHorizontal className="h-5 w-5" strokeWidth={1.6} />
            {filtered && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-sale" />}
          </button>
        </Container>
      </div>

      <Container className="pb-4 pt-6">
        <div className="mb-6 sm:hidden">
          <Breadcrumbs items={breadcrumb} />
        </div>

        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[32px] leading-tight text-ink sm:text-[44px]">{title}</h1>
            {description && <p className="mt-2 max-w-2xl text-[15px] text-light-color">{description}</p>}
          </div>
          <p className="hidden text-[15px] text-ink sm:block">
            {visible.length ? `1 - ${visible.length} of ${visible.length}` : "0"} Items
          </p>
        </div>

        {promoText && (
          <div className="mb-8 rounded-md bg-ink px-4 py-3 text-center text-[15px] font-medium text-white sm:text-base">
            {promoText}
          </div>
        )}

        {filtered && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {price && (
              <button
                onClick={() => setPrice(null)}
                className="inline-flex items-center gap-1.5 rounded-full border border-ink px-3 py-1 text-sm"
              >
                {PRICES.find((p) => p.value === price)?.label} <X className="h-3.5 w-3.5" />
              </button>
            )}
            {availability && (
              <button
                onClick={() => setAvailability(null)}
                className="inline-flex items-center gap-1.5 rounded-full border border-ink px-3 py-1 text-sm"
              >
                {AVAILABILITY.find((a) => a.value === availability)?.label} <X className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={() => {
                setPrice(null);
                setAvailability(null);
              }}
              className="ml-1 text-sm text-light-color underline underline-offset-4 hover:text-ink"
            >
              Clear all
            </button>
          </div>
        )}

        {visible.length ? (
          <div className="grid grid-cols-1 gap-x-6 gap-y-12 min-[480px]:grid-cols-2 lg:grid-cols-4">
            {visible.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-white px-6 py-20 text-center">
            <p className="text-2xl text-ink">No products found</p>
            <p className="mt-2 text-[15px] text-light-color">
              {filtered ? "Try removing a filter." : emptyText || "New products are on the way — check back soon."}
            </p>
            <Link href="/shop" className="mt-6 inline-block text-[15px] text-ink underline underline-offset-4">
              Browse all products
            </Link>
          </div>
        )}
      </Container>

      {/* Phone filter sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSheetOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl text-ink">Filter & sort</h2>
              <button onClick={() => setSheetOpen(false)} className="-mr-2 p-2" aria-label="Close">
                <X className="h-6 w-6" strokeWidth={1.6} />
              </button>
            </div>
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.3em] text-light-color">Sort by</p>
                <div className="flex flex-wrap gap-2">
                  {SORTS.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setSort(s.value as Sort)}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm",
                        sort === s.value ? "border-ink bg-ink text-white" : "border-black/15 text-ink"
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.3em] text-light-color">Price</p>
                <div className="flex flex-wrap gap-2">
                  {PRICES.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setPrice(price === p.value ? null : p.value)}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm",
                        price === p.value ? "border-ink bg-ink text-white" : "border-black/15 text-ink"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.3em] text-light-color">Availability</p>
                <div className="flex flex-wrap gap-2">
                  {AVAILABILITY.map((a) => (
                    <button
                      key={a.value}
                      onClick={() => setAvailability(availability === a.value ? null : a.value)}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm",
                        availability === a.value ? "border-ink bg-ink text-white" : "border-black/15 text-ink"
                      )}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-7 grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setPrice(null);
                  setAvailability(null);
                  setSort("default");
                }}
                className="h-12 rounded-md border border-ink text-[15px] font-medium"
              >
                Clear
              </button>
              <button onClick={() => setSheetOpen(false)} className="h-12 rounded-md bg-ink text-[15px] font-medium text-white">
                Show {visible.length} item{visible.length === 1 ? "" : "s"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
