import LatestBlog from "@/components/LatestBlog";
import HeroGrid from "@/components/home/HeroGrid";
import ServiceStrip from "@/components/home/ServiceStrip";
import TileRail, { type Tile } from "@/components/home/TileRail";
import ProductRail from "@/components/home/ProductRail";
import PromoBanner from "@/components/home/PromoBanner";
import StyleGuide, { type StyleLook } from "@/components/home/StyleGuide";
import BrandsBand from "@/components/home/BrandsBand";
import CustomerReviews from "@/components/home/CustomerReviews";
import RecentlyViewed from "@/components/home/RecentlyViewed";
import { getBanner } from "@/sanity/queries";
import { image } from "@/sanity/image";
import type { Product } from "@/sanity.types";
import {
  getCategoryShelves,
  getEditorsPicks,
  getFlashDeals,
  getHomeBrands,
  getHomeCategories,
  getHomeReviews,
  getLookbooks,
  getNewArrivals,
  getTopRated,
} from "@/lib/homeData";
import { generateOrganizationSchema, generateWebsiteSchema } from "@/lib/seo";
import { getSiteSettings } from "@/lib/siteSeo";
import { jsonLd } from "@/lib/jsonLd";

type ImageSource = Parameters<typeof image>[0];

const photo = (src: ImageSource | undefined, w: number, h?: number) => {
  if (!src) return undefined;
  const b = image(src).width(w);
  return (h ? b.height(h).fit("crop") : b).auto("format").url();
};

const productHref = (p: Product) => `/product/${p.slug?.current}`;
const validDiscount = (d?: number) => (d && d > 0 && d < 100 ? d : 0);

export default async function Home() {
  const [settings, banners, categories, newArrivals, shelves, onSale, topRated, editorsPicks, brands, reviews, looks] =
    await Promise.all([
      getSiteSettings(),
      getBanner(),
      getHomeCategories(),
      getNewArrivals(),
      getCategoryShelves(4),
      getFlashDeals(),
      getTopRated(),
      getEditorsPicks(),
      getHomeBrands(),
      getHomeReviews(),
      getLookbooks(),
    ]);

  const organizationSchema = generateOrganizationSchema(settings);
  const websiteSchema = generateWebsiteSchema(settings);
  const withImage = (list: Product[]) => list.filter((p) => p.images?.[0] && p.slug?.current);

  // Portrait category tiles; collections built from the catalogue while there are no categories
  const categoryTiles: Tile[] = categories
    .map((c) => ({
      key: c._id,
      title: c.title,
      href: `/category/${c.slug}`,
      image: photo(c.image ?? c.productImage, 560, 700),
      note: c.productCount ? `${c.productCount} ${c.productCount === 1 ? "item" : "items"}` : undefined,
    }));

  const used = new Set<string>();
  const pick = (list: Product[]) => {
    const p = withImage(list).find((x) => !used.has(x._id)) ?? withImage(list)[0];
    if (p) used.add(p._id);
    return p;
  };
  const collectionTiles: Tile[] = [
    { key: "new", title: "New in", href: "/shop", from: newArrivals },
    { key: "sale", title: "Sale", href: "/deal", from: onSale },
    { key: "loved", title: "Most loved", href: "/shop", from: topRated },
    { key: "picks", title: "Editor's picks", href: "/shop", from: editorsPicks },
    { key: "all", title: "Shop all", href: "/shop", from: [...newArrivals].reverse() },
  ].flatMap(({ from, ...t }) => {
    const p = pick(from);
    return p ? [{ ...t, image: photo(p.images?.[0], 560, 700) }] : [];
  });

  // Style Guide: looks from Studio, or an edit of the newest pieces
  const toItem = (p: Product, key: string, x?: number, y?: number) => ({
    key,
    x,
    y,
    name: p.name ?? "",
    href: productHref(p),
    image: photo(p.images?.[0], 160, 200),
    price: p.price,
    discount: p.discount,
  });
  const styleLooks: StyleLook[] = looks.length
    ? looks
        .filter((l) => l.image)
        .map((l) => ({
          id: l._id,
          title: l.title,
          description: l.description,
          image: photo(l.image, 1600) as string,
          items: l.spots.filter((s) => s.product?.slug?.current).map((s) => toItem(s.product, s._key, s.x, s.y)),
        }))
    : (() => {
        const pieces = withImage(editorsPicks.length >= 3 ? editorsPicks : newArrivals).slice(0, 4);
        if (pieces.length < 2) return [];
        return [
          {
            id: "edit",
            title: "The new edit",
            description: `Handpicked favourites from ${settings.storeName}.`,
            image: photo(pieces[0].images?.[0], 1600) as string,
            items: pieces.map((p) => toItem(p, p._id)),
          },
        ];
      })();

  // Sale campaign block
  const topDiscount = Math.max(0, ...onSale.map((p) => validDiscount(p.discount)));
  const saleImages = withImage(onSale)
    .slice(0, 3)
    .map((p) => photo(p.images?.[0], 900) as string);

  const brandCards = brands.map((b) => ({
    id: b._id,
    title: b.title,
    href: b.slug ? `/shop?brand=${b.slug}` : "/brands",
    logo: photo(b.image, 320),
    description: b.description,
  }));

  return (
    <div className="pb-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(websiteSchema) }} />

      <HeroGrid banners={banners ?? []} products={newArrivals} storeName={settings.storeName} />
      <ServiceStrip
        deliveryCharge={settings.deliveryCharge}
        freeDeliveryOver={settings.freeDeliveryOver}
        supportPhone={settings.supportPhone}
      />

      {categoryTiles.length > 0 ? (
        <TileRail title="Shop by category" href="/category" tiles={categoryTiles} />
      ) : (
        <TileRail title="Shop by collection" href="/shop" tiles={collectionTiles} />
      )}

      <ProductRail title="New arrivals" href="/shop" products={newArrivals} />

      {shelves.map((shelf) => (
        <ProductRail key={shelf._id} title={shelf.title} href={`/category/${shelf.slug}`} products={shelf.products} />
      ))}

      {saleImages.length > 0 && (
        <PromoBanner
          eyebrow="Limited time"
          title={topDiscount ? `Up to ${topDiscount}% off` : "The Sale"}
          text="Last chance on selected styles. Once they are gone, they are gone."
          href="/deal"
          cta="Shop the sale"
          images={saleImages}
        />
      )}
      <ProductRail title="Sale" eyebrow="Limited time" href="/deal" products={onSale} />

      <StyleGuide looks={styleLooks} />

      <ProductRail title="Most loved" href="/shop" products={topRated} />
      <ProductRail title="Editor's picks" href="/shop" products={editorsPicks} />

      <BrandsBand brands={brandCards} />
      <CustomerReviews reviews={reviews} />
      <RecentlyViewed />
      <LatestBlog />
    </div>
  );
}
