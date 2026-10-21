"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Container from "../Container";
import SectionHeading from "../SectionHeading";
import PriceView from "../PriceView";
import { sanityImgProps } from "@/lib/sanityImage";
import { cn } from "@/lib/utils";

const LOOK_WIDTHS = [640, 960, 1280, 1600] as const;
/** Photo column is 1.6fr of the 1280px container on desktop, full width below */
const LOOK_SIZES = "(min-width: 1280px) 790px, (min-width: 1024px) 62vw, 100vw";

export interface StyleLookItem {
  key: string;
  /** Dot position in % of the photo; items without one are only listed */
  x?: number;
  y?: number;
  name: string;
  href: string;
  image?: string;
  price?: number;
  discount?: number;
}

export interface StyleLook {
  id: string;
  title: string;
  description?: string;
  image: string;
  items: StyleLookItem[];
}

/** "Style Guide": a photo with product dots and a "shop the look" list beside it */
export default function StyleGuide({ looks }: { looks: StyleLook[] }) {
  const [index, setIndex] = useState(0);
  const [active, setActive] = useState<string | null>(null);
  if (!looks.length) return null;

  const look = looks[Math.min(index, looks.length - 1)];
  const go = (dir: number) => {
    setActive(null);
    setIndex((i) => (i + dir + looks.length) % looks.length);
  };
  const spots = look.items.filter((i) => typeof i.x === "number" && typeof i.y === "number");

  return (
    <Container className="mt-16 sm:mt-24">
      <SectionHeading title="Style Guide" />
      <div className="grid overflow-hidden rounded-md bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* Photo with product dots */}
        <div className="relative aspect-[4/5] bg-sand sm:aspect-[16/11] lg:aspect-auto lg:min-h-[38rem]">
          <img
            key={look.image}
            {...sanityImgProps(look.image, { widths: LOOK_WIDTHS, sizes: LOOK_SIZES })}
            alt={look.title}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500"
          />
          {spots.map((spot, n) => {
            const open = active === spot.key;
            const below = (spot.y ?? 0) < 45;
            const alignRight = (spot.x ?? 0) > 60;
            return (
              <div
                key={spot.key}
                className="absolute z-10"
                style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                onMouseEnter={() => setActive(spot.key)}
                onMouseLeave={() => setActive((k) => (k === spot.key ? null : k))}
              >
                <button
                  type="button"
                  onClick={() => setActive(open ? null : spot.key)}
                  aria-label={`${spot.name} (${n + 1})`}
                  aria-expanded={open}
                  className="group relative flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/35 backdrop-blur-sm transition-transform hover:scale-110"
                >
                  <span className="absolute inset-0 rounded-full bg-white/40 motion-safe:animate-ping [animation-duration:2.2s]" />
                  <span className={cn("relative h-3.5 w-3.5 rounded-full bg-white shadow transition-colors", open && "bg-ink")} />
                </button>
                <div
                  className={cn(
                    "absolute w-60 rounded-md bg-white p-3 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.35)] transition-all duration-200",
                    below ? "top-6" : "bottom-6",
                    alignRight ? "right-0" : "-left-4",
                    open ? "visible translate-y-0 opacity-100" : "invisible translate-y-1 opacity-0"
                  )}
                >
                  <Link href={spot.href} className="flex gap-3">
                    {spot.image && (
                      <img
                        src={spot.image}
                        alt=""
                        width={56}
                        height={72}
                        loading="lazy"
                        decoding="async"
                        className="h-[4.5rem] w-14 shrink-0 rounded object-cover"
                      />
                    )}
                    <span className="min-w-0">
                      <span className="line-clamp-2 text-sm leading-snug text-ink">{spot.name}</span>
                      <span className="mt-1 block">
                        <PriceView price={spot.price} discount={spot.discount} size="sm" showBadge={false} />
                      </span>
                      <span className="mt-1 inline-flex items-center gap-1 text-xs text-ink underline underline-offset-4">
                        View product
                      </span>
                    </span>
                  </Link>
                </div>
              </div>
            );
          })}
          {looks.length > 1 && (
            <div className="absolute inset-y-0 right-3 flex items-center lg:hidden">
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Next look"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink shadow"
              >
                <ChevronRight className="h-5 w-5" strokeWidth={1.6} />
              </button>
            </div>
          )}
        </div>

        {/* Shop the look */}
        <div className="flex flex-col p-6 sm:p-8 lg:p-10">
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-light-color">Shop the look</p>
          <h3 className="mt-2 text-2xl leading-tight text-ink sm:text-3xl">{look.title}</h3>
          {look.description && <p className="mt-2 text-[15px] leading-relaxed text-light-color">{look.description}</p>}

          <ul className="mt-6 divide-y divide-black/[0.07] border-y border-black/[0.07]">
            {look.items.slice(0, 5).map((item) => {
              const spotNo = spots.findIndex((s) => s.key === item.key);
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    onMouseEnter={() => setActive(item.key)}
                    onMouseLeave={() => setActive(null)}
                    className={cn(
                      "group flex items-center gap-4 py-3.5 transition-colors",
                      active === item.key && "bg-cream/60"
                    )}
                  >
                    <span className="relative h-20 w-16 shrink-0 overflow-hidden rounded bg-sand">
                      {item.image && (
                        <img
                          src={item.image}
                          alt=""
                          width={64}
                          height={80}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      )}
                      {spotNo >= 0 && (
                        <span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-medium text-ink">
                          {spotNo + 1}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-[15px] leading-snug text-ink group-hover:underline group-hover:underline-offset-4">
                        {item.name}
                      </span>
                      <span className="mt-1 block">
                        <PriceView price={item.price} discount={item.discount} size="sm" />
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 -translate-x-1 text-ink opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-auto flex items-center justify-between gap-4 pt-8">
            {looks.length > 1 ? (
              <>
                <div className="flex items-center gap-3 text-sm text-light-color">
                  <span className="tabular-nums text-ink">{String(index + 1).padStart(2, "0")}</span>
                  <span className="relative h-px w-20 bg-black/15">
                    <span
                      className="absolute inset-y-0 left-0 bg-ink transition-all duration-500"
                      style={{ width: `${((index + 1) / looks.length) * 100}%` }}
                    />
                  </span>
                  <span className="tabular-nums">{String(looks.length).padStart(2, "0")}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => go(-1)}
                    aria-label="Previous look"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-black/15 text-ink transition-colors hover:border-ink hover:bg-ink hover:text-white"
                  >
                    <ChevronLeft className="h-5 w-5" strokeWidth={1.6} />
                  </button>
                  <button
                    type="button"
                    onClick={() => go(1)}
                    aria-label="Next look"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-black/15 text-ink transition-colors hover:border-ink hover:bg-ink hover:text-white"
                  >
                    <ChevronRight className="h-5 w-5" strokeWidth={1.6} />
                  </button>
                </div>
              </>
            ) : (
              <Link href="/shop" className="text-sm font-medium text-ink underline underline-offset-4 hover:text-light-color">
                Shop all
              </Link>
            )}
          </div>
        </div>
      </div>
    </Container>
  );
}
