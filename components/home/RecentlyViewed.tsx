"use client";

import Link from "next/link";
import { clearRecentlyViewed, useRecentlyViewed } from "@/lib/recentlyViewed";
import { formatPrice } from "@/lib/storeConfig";
import Container from "../Container";
import SectionHeading from "../SectionHeading";

const RecentlyViewed = () => {
  const items = useRecentlyViewed();

  if (items.length < 2) return null;

  return (
    <Container className="mt-16 sm:mt-20">
      <SectionHeading eyebrow="Pick up where you left off" title="Recently viewed">
        <button
          type="button"
          onClick={clearRecentlyViewed}
          className="text-sm font-medium text-light-color underline-offset-4 hover:text-ink hover:underline"
        >
          Clear
        </button>
      </SectionHeading>
      <ul className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide sm:gap-4">
        {items.map((item) => (
          <li key={item.id} className="w-32 shrink-0 snap-start sm:w-40">
            <Link href={`/product/${item.slug}`} className="group block">
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-sand">
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    width={160}
                    height={160}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-contain p-3 mix-blend-multiply transition-transform duration-300 group-hover:scale-105"
                  />
                )}
              </div>
              <p className="mt-2 line-clamp-2 text-sm font-medium leading-snug text-ink group-hover:text-clay">
                {item.name}
              </p>
              {typeof item.price === "number" && (
                <p className="mt-0.5 text-sm font-semibold text-ink">{formatPrice(item.price)}</p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
};

export default RecentlyViewed;
