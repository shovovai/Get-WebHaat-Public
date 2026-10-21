import Link from "next/link";
import { image } from "@/sanity/image";
import { sanityImgProps } from "@/lib/sanityImage";
import type { Product } from "@/sanity.types";
import Container from "../Container";
import { cn } from "@/lib/utils";

type ImageSource = Parameters<typeof image>[0];

interface Banner {
  _id: string;
  title?: string;
  description?: string;
  badge?: string;
  discountAmount?: number;
  image?: ImageSource;
}

interface Tile {
  key: string;
  href: string;
  eyebrow?: string;
  title: string;
  image?: ImageSource;
}

/** Campaign banners from Studio, or the newest products while there are none */
function buildTiles(banners: Banner[], products: Product[], storeName: string): Tile[] {
  const fromBanners: Tile[] = banners
    .filter((b) => b.image && b.title)
    .map((b) => ({
      key: b._id,
      href: b.discountAmount ? "/deal" : "/shop",
      eyebrow: b.badge || (b.discountAmount ? `Up to ${b.discountAmount}% off` : undefined),
      title: b.title as string,
      image: b.image,
    }));
  if (fromBanners.length >= 3) return fromBanners.slice(0, 3);

  const fromProducts: Tile[] = products
    .filter((p) => p.images?.[0] && p.slug?.current)
    .map((p) => ({
      key: p._id,
      href: `/product/${p.slug?.current}`,
      eyebrow:
        p.discount && p.discount > 0 && p.discount < 100 ? `${p.discount}% off` : p.status === "new" ? "Just in" : "New arrival",
      title: p.name || "New arrival",
      image: p.images?.[0] as ImageSource,
    }));

  const tiles = [...fromBanners, ...fromProducts].slice(0, 3);
  while (tiles.length < 3) {
    tiles.push({
      key: `placeholder-${tiles.length}`,
      href: "/shop",
      eyebrow: storeName,
      title: ["The new collection", "Everyday essentials", "Shop the edit"][tiles.length],
    });
  }
  return tiles;
}

const HERO_WIDTHS = [480, 640, 828, 1080, 1280, 1600] as const;
/** Each tile is half the 1280px container on desktop, full width on phones */
const HERO_SIZES = "(min-width: 1280px) 630px, (min-width: 1024px) 50vw, 100vw";

const HeroTile = ({ tile, large, className }: { tile: Tile; large?: boolean; className?: string }) => (
  <Link
    href={tile.href}
    className={cn("group relative block overflow-hidden rounded-xl bg-[#1c1c1e]", className)}
  >
    {tile.image && (
      <img
        {...sanityImgProps(tile.image, { widths: HERO_WIDTHS, sizes: HERO_SIZES })}
        alt=""
        // The large tile is the page's LCP element; the others are above the fold too
        loading="eager"
        fetchPriority={large ? "high" : undefined}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.2s] group-hover:scale-[1.04]"
      />
    )}
    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
    <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
      {tile.eyebrow && (
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.3em] text-white/80">{tile.eyebrow}</p>
      )}
      <h2
        className={cn(
          "line-clamp-2 max-w-md leading-[1.05] text-white",
          large ? "text-3xl sm:text-5xl" : "text-2xl sm:text-3xl"
        )}
      >
        {tile.title}
      </h2>
      <span className="mt-3 inline-block text-sm font-medium text-white underline underline-offset-4">
        Shop now
      </span>
    </div>
  </Link>
);

const HeroGrid = ({
  banners,
  products,
  storeName,
}: {
  banners: Banner[];
  products: Product[];
  storeName: string;
}) => {
  const [main, second, third] = buildTiles(banners, products, storeName);

  return (
    <Container className="pt-4 sm:pt-6">
      <section className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <HeroTile tile={main} large className="aspect-[4/3] lg:aspect-auto lg:h-[540px]" />
        <div className="grid gap-4 lg:grid-rows-2 lg:gap-5">
          <HeroTile tile={second} className="aspect-[2.2/1] lg:aspect-auto" />
          <HeroTile tile={third} className="aspect-[2.2/1] lg:aspect-auto" />
        </div>
      </section>
    </Container>
  );
};

export default HeroGrid;
