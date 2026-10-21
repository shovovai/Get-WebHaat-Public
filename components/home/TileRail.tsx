import Link from "next/link";
import RailScroller from "./RailScroller";
import { sanityImgProps } from "@/lib/sanityImage";

const TILE_WIDTHS = [280, 400, 560, 720] as const;
/** Tiles are 62% / 38% / 25% of the 1280px container */
const TILE_SIZES = "(min-width: 1280px) 305px, (min-width: 1024px) 24vw, (min-width: 640px) 38vw, 62vw";

export interface Tile {
  key: string;
  title: string;
  href: string;
  image?: string;
  /** Small line above the title, e.g. "12 products" */
  note?: string;
}

/** Row of tall photo tiles with the label over a dark fade (categories, collections) */
export default function TileRail({
  title,
  href,
  eyebrow,
  tiles,
}: {
  title: string;
  href?: string;
  eyebrow?: string;
  tiles: Tile[];
}) {
  if (!tiles.length) return null;

  return (
    <RailScroller title={title} href={href} eyebrow={eyebrow}>
      {tiles.map((tile) => (
        <Link
          key={tile.key}
          href={tile.href}
          className="group relative block aspect-[4/5] w-[62%] shrink-0 snap-start overflow-hidden rounded-md bg-sand sm:w-[38%] lg:w-[calc(25%-15px)]"
        >
          {tile.image ? (
            <img
              {...sanityImgProps(tile.image, { widths: TILE_WIDTHS, sizes: TILE_SIZES, ratio: 5 / 4 })}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-7xl text-ink/10">
              {tile.title.charAt(0)}
            </span>
          )}
          <span className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
          <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 sm:p-6">
            <span className="min-w-0">
              {tile.note && <span className="mb-1 block text-xs uppercase tracking-[0.2em] text-white/70">{tile.note}</span>}
              <span className="line-clamp-2 block text-[22px] leading-tight text-white sm:text-2xl">{tile.title}</span>
            </span>
            <span className="flex h-9 w-9 shrink-0 translate-x-2 items-center justify-center rounded-full bg-white text-ink opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          </span>
        </Link>
      ))}
    </RailScroller>
  );
}
