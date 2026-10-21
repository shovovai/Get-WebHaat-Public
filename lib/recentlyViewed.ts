import { useSyncExternalStore } from "react";
import { image } from "@/sanity/image";
import type { Product } from "@/sanity.types";

const KEY = "webhaat-recently-viewed";
const MAX_ITEMS = 12;
const CHANGE_EVENT = "recently-viewed-change";

export interface RecentItem {
  id: string;
  slug: string;
  name: string;
  image?: string;
  price?: number;
}

const isItem = (x: unknown): x is RecentItem =>
  !!x &&
  typeof (x as RecentItem).id === "string" &&
  typeof (x as RecentItem).slug === "string" &&
  typeof (x as RecentItem).name === "string";

/** Products this browser opened, newest first (stored locally only) */
export function readRecentlyViewed(): RecentItem[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(list)
      ? list.filter(isItem).map((i) => ({
          ...i,
          image: i.image?.startsWith("https://cdn.sanity.io/") ? i.image : undefined,
        }))
      : [];
  } catch {
    return [];
  }
}

export function recordRecentlyViewed(product: Product) {
  const slug = product?.slug?.current;
  if (!product?._id || !slug) return;
  try {
    const item: RecentItem = {
      id: product._id,
      slug,
      name: product.name || "Product",
      image: product.images?.[0] ? image(product.images[0]).size(300, 300).url() : undefined,
      price: product.price,
    };
    const next = [item, ...readRecentlyViewed().filter((i) => i.id !== item.id)].slice(0, MAX_ITEMS);
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // storage full or blocked — not critical
  }
}

export function clearRecentlyViewed() {
  try {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {}
}

// Snapshot must be referentially stable between reads
const EMPTY: RecentItem[] = [];
let cachedRaw: string | null = null;
let cachedItems: RecentItem[] = EMPTY;

function getSnapshot(): RecentItem[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {}
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedItems = readRecentlyViewed();
  }
  return cachedItems;
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** Live list; empty during server render */
export const useRecentlyViewed = () => useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
