"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BrandCard {
  id: string;
  title: string;
  href: string;
  logo?: string;
  description?: string;
}

/** "Our Brands": dark carousel with the focused card in the middle */
export default function BrandsBand({ brands }: { brands: BrandCard[] }) {
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);
  const paused = useRef(false);
  const count = brands.length;

  // Drift to the next brand every few seconds unless the visitor is interacting
  useEffect(() => {
    if (count < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      if (!paused.current) setIndex((i) => (i + 1) % count);
    }, 5000);
    return () => clearInterval(id);
  }, [count]);

  if (!count) return null;

  const go = (dir: number) => setIndex((i) => (i + dir + count) % count);
  // Shortest signed distance from the focused card, so the row wraps around
  const offset = (i: number) => {
    let d = i - index;
    if (d > count / 2) d -= count;
    if (d < -count / 2) d += count;
    return d;
  };

  return (
    <section
      className="relative mt-20 overflow-hidden bg-black py-16 text-white sm:mt-28 sm:py-24"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
    >
      {/* Soft marble-like light */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(60% 50% at 15% 20%, rgba(255,255,255,0.10), transparent 60%), radial-gradient(50% 60% at 85% 80%, rgba(255,255,255,0.08), transparent 60%), radial-gradient(40% 40% at 60% 10%, rgba(255,255,255,0.05), transparent 70%)",
        }}
      />

      <div className="relative text-center">
        <p className="text-[12px] font-medium uppercase tracking-[0.3em] text-white/55">Discover</p>
        <h2 className="mt-2 text-[32px] text-white sm:text-5xl">Our Brands</h2>
      </div>

      <div
        className="relative mt-12 h-[23rem] sm:h-[25rem]"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
      >
        {brands.map((brand, i) => {
          const d = offset(i);
          const abs = Math.abs(d);
          const hidden = abs > 2;
          return (
            <Link
              key={brand.id}
              href={brand.href}
              tabIndex={d === 0 ? 0 : -1}
              aria-hidden={d !== 0}
              onClick={(e) => {
                if (d !== 0) {
                  e.preventDefault();
                  setIndex(i);
                }
              }}
              className={cn(
                "absolute left-1/2 top-1/2 flex h-[21rem] w-[15rem] flex-col items-center justify-between rounded-lg border border-white/10 p-6 text-center transition-all duration-500 ease-out sm:h-[23rem] sm:w-[17rem]",
                d === 0 ? "bg-gradient-to-b from-[#4d4d50] to-[#2a2a2c] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)]" : "bg-gradient-to-b from-[#3a3a3c] to-[#1c1c1e]",
                hidden && "pointer-events-none opacity-0"
              )}
              style={{
                transform: `translate(calc(-50% + ${d * 118}%), -50%) scale(${1 - Math.min(abs, 2) * 0.12})`,
                zIndex: 10 - abs,
                opacity: hidden ? 0 : 1 - abs * 0.28,
              }}
            >
              <div className="flex h-16 w-full items-center justify-center">
                {brand.logo && (
                  <img src={brand.logo} alt="" loading="lazy" decoding="async" className="max-h-14 max-w-[75%] object-contain brightness-0 invert" />
                )}
              </div>
              {brand.description ? (
                <p className={cn("line-clamp-6 text-[13px] leading-relaxed", d === 0 ? "text-white/85" : "text-white/55")}>
                  {brand.description}
                </p>
              ) : (
                <span />
              )}
              <p className="text-base uppercase tracking-[0.3em] text-white">{brand.title}</p>
            </Link>
          );
        })}
      </div>

      {count > 1 && (
        <div className="relative mt-8 flex items-center justify-center gap-8">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous brand"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/30 text-white transition-colors hover:bg-white hover:text-ink"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={1.6} />
          </button>
          <div className="flex gap-1.5">
            {brands.map((b, i) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show ${b.title}`}
                className={cn("h-1 rounded-full transition-all duration-300", i === index ? "w-10 bg-white" : "w-4 bg-white/30 hover:bg-white/60")}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next brand"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/30 text-white transition-colors hover:bg-white hover:text-ink"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={1.6} />
          </button>
        </div>
      )}
      <div className="relative mt-8 text-center">
        <Link href="/brands" className="text-sm text-white/80 underline underline-offset-4 hover:text-white">
          View all brands
        </Link>
      </div>
    </section>
  );
}
