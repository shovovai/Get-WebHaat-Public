import "server-only";
import { cache } from "react";
import { cmsFetch } from "@/sanity/lib/fetch";
import { TAGS } from "@/lib/cache";
import { image } from "@/sanity/image";

export interface MenuTile {
  title: string;
  href: string;
  image: string;
}

export interface MenuSection {
  key: string;
  title: string;
  href: string;
  links: { title: string; href: string }[];
  tiles: MenuTile[];
}

export interface MenuData {
  categories: { title: string; slug: string }[];
  /** Mega-menu panels keyed by top-level nav item ("new", "sale", "cat:<slug>") */
  sections: MenuSection[];
}

type Img = Parameters<typeof image>[0];
interface RawProduct {
  name?: string;
  slug?: string;
  image?: Img;
}

const tile = (p: RawProduct): MenuTile | null =>
  p.slug && p.image
    ? { title: p.name || "Product", href: `/product/${p.slug}`, image: image(p.image).width(440).height(550).fit("crop").url() }
    : null;

const QUERY = `{
  "categories": *[_type == "category" && defined(slug.current)] | order(title asc)[0...12]{
    title, "slug": slug.current, image,
    "products": *[_type == "product" && references(^._id) && defined(images[0])] | order(_createdAt desc)[0...3]{
      name, "slug": slug.current, "image": images[0]
    }
  },
  "newest": *[_type == "product" && defined(images[0])] | order(_createdAt desc)[0...3]{ name, "slug": slug.current, "image": images[0] },
  "sale": *[_type == "product" && defined(images[0]) && ((discount > 0 && discount < 100) || status in ["hot", "sale"])]
    | order(discount desc)[0...3]{ name, "slug": slug.current, "image": images[0] },
  "brands": *[_type == "brand" && defined(slug.current)] | order(title asc)[0...8]{ title, "slug": slug.current }
}`;

const EMPTY_MENU = { categories: [], newest: [], sale: [], brands: [] };

/** Navigation + mega-menu content: cached read, refreshed by tag (hourly at most otherwise) */
export const getMenuData = cache(async (): Promise<MenuData> => {
  const raw = await cmsFetch<{
    categories: { title: string; slug: string; image?: Img; products: RawProduct[] }[];
    newest: RawProduct[];
    sale: RawProduct[];
    brands: { title: string; slug: string }[];
  }>(QUERY, {}, { tags: [TAGS.products, TAGS.categories, TAGS.brands], fallback: EMPTY_MENU });

  const categories = raw.categories.map((c) => ({ title: c.title, slug: c.slug }));
  const categoryLinks = categories.map((c) => ({ title: c.title, href: `/category/${c.slug}` }));

  const sections: MenuSection[] = [
    {
      key: "new",
      title: "New arrivals",
      href: "/shop",
      links: [
        { title: "All products", href: "/shop" },
        ...(categoryLinks.length ? categoryLinks.slice(0, 7) : [{ title: "All categories", href: "/category" }]),
        { title: "Brands", href: "/brands" },
      ],
      tiles: raw.newest.map(tile).filter(Boolean) as MenuTile[],
    },
    {
      key: "sale",
      title: "Sale",
      href: "/deal",
      links: [{ title: "All offers", href: "/deal" }, ...categoryLinks.slice(0, 6)],
      tiles: raw.sale.map(tile).filter(Boolean) as MenuTile[],
    },
    ...raw.categories.map((c) => ({
      key: `cat:${c.slug}`,
      title: c.title,
      href: `/category/${c.slug}`,
      links: [
        { title: "All", href: `/category/${c.slug}` },
        { title: "New arrivals", href: `/shop?category=${c.slug}` },
        ...raw.brands.slice(0, 5).map((b) => ({ title: b.title, href: `/brands/${b.slug}` })),
      ],
      tiles: c.products.map(tile).filter(Boolean) as MenuTile[],
    })),
  ];

  return { categories, sections };
});
