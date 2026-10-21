"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { sanityImgProps, sanityUrl } from "@/lib/sanityImage";
import type { Product } from "@/sanity.types";
import { cn } from "@/lib/utils";

type Images = NonNullable<Product["images"]>;

const GALLERY_WIDTHS = [480, 640, 828, 1080, 1200] as const;
/** Gallery column is 560px wide on desktop, full width on phones */
const GALLERY_SIZES = "(min-width: 1024px) 560px, 100vw";

/** Swipeable product photos with arrows, a progress bar and thumbnails */
export default function ProductGallery({ images = [], alt, soldOut }: { images?: Images; alt: string; soldOut?: boolean }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const count = images.length;

  const goTo = (i: number) => {
    const el = trackRef.current;
    if (!el || !count) return;
    const next = (i + count) % count;
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    setIndex(next);
  };

  const onScroll = () => {
    const el = trackRef.current;
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  if (!count) {
    return <div className="-mx-4 aspect-[4/5] bg-sand sm:mx-0 sm:rounded-lg" />;
  }

  return (
    <div>
      <div className="relative -mx-4 overflow-hidden bg-sand sm:mx-0 sm:rounded-lg">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="flex aspect-[4/5] snap-x snap-mandatory overflow-x-auto scrollbar-hide"
        >
          {images.map((img, i) => (
            <div key={img._key || i} className="relative h-full w-full shrink-0 snap-center">
              <img
                {...sanityImgProps(img, { widths: GALLERY_WIDTHS, sizes: GALLERY_SIZES, ratio: 5 / 4 })}
                alt={i === 0 ? alt : `${alt} — photo ${i + 1}`}
                className={cn("h-full w-full object-cover", soldOut && "opacity-60 grayscale")}
                // First photo is the product page's LCP element
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : undefined}
                decoding={i === 0 ? undefined : "async"}
              />
            </div>
          ))}
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-black/10 text-white backdrop-blur-sm transition-colors hover:bg-black/40"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-black/10 text-white backdrop-blur-sm transition-colors hover:bg-black/40"
              aria-label="Next photo"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="absolute bottom-5 left-4 rounded-full bg-white/85 px-4 py-1.5 text-[15px] tabular-nums text-ink backdrop-blur sm:hidden">
              {index + 1} | {count}
            </span>
          </>
        )}
      </div>

      {count > 1 && (
        <>
          <div className="mt-5 hidden items-center justify-center gap-4 sm:flex">
            <span className="text-sm tabular-nums text-ink">
              {index + 1} / {count}
            </span>
            <div className="h-1 w-56 overflow-hidden rounded-full border border-ink/80">
              <div
                className="h-full rounded-full bg-ink transition-all duration-300"
                style={{ width: `${((index + 1) / count) * 100}%` }}
              />
            </div>
          </div>
          <div className="mt-5 hidden gap-3 sm:flex">
            {images.map((img, i) => (
              <button
                key={img._key || i}
                type="button"
                onClick={() => goTo(i)}
                className={cn(
                  "h-24 w-20 overflow-hidden rounded-md border-2 bg-sand transition-colors",
                  i === index ? "border-ink" : "border-transparent hover:border-ink/30"
                )}
                aria-label={`Show photo ${i + 1}`}
              >
                <img
                  src={sanityUrl(img, 160, { ratio: 5 / 4 })}
                  alt=""
                  width={80}
                  height={100}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
