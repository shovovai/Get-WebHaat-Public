import type { Metadata } from "next";
import { client } from "@/sanity/lib/client";
import type { Product } from "@/sanity.types";
import ProductBrowser, { type SubNavItem } from "@/components/listing/ProductBrowser";

export const metadata: Metadata = {
  title: "Shop all products",
  description: "Browse every product in the store — new arrivals, best sellers and the latest offers.",
};

type Props = { searchParams: Promise<{ search?: string; category?: string; brand?: string }> };

const QUERY = `{
  "products": *[_type == "product"
    && (!defined($category) || references(*[_type == "category" && slug.current == $category]._id))
    && (!defined($brand) || brand->slug.current == $brand)
    && (!defined($search) || name match $search || description match $search)
  ] | order(isFeatured desc, _createdAt desc){ ..., "categories": categories[]->title, brand->{_id, title} },
  "categories": *[_type == "category" && defined(slug.current)] | order(title asc){ title, "slug": slug.current },
  "brandTitle": *[_type == "brand" && slug.current == $brand][0].title
}`;

const clean = (v?: string) => (typeof v === "string" ? v.trim().slice(0, 60) : "");

export default async function ShopPage({ searchParams }: Props) {
  const params = await searchParams;
  const term = clean(params.search).replace(/[*"\\]/g, "");
  const category = clean(params.category) || null;
  const brand = clean(params.brand) || null;

  const { products, categories, brandTitle } = await client.fetch<{
    products: Product[];
    categories: { title: string; slug: string }[];
    brandTitle: string | null;
  }>(QUERY, { search: term ? `${term}*` : null, category, brand });

  const subnav: SubNavItem[] = [
    { title: "All", href: "/shop", active: !category && !brand && !term },
    ...categories.map((c) => ({ title: c.title, href: `/category/${c.slug}` })),
  ];

  const title = term ? `Results for “${term}”` : brandTitle || "All products";

  return (
    <ProductBrowser
      title={title}
      breadcrumb={[{ label: "Home", href: "/" }, { label: term ? "Search" : brandTitle || "Shop" }]}
      subnav={subnav}
      products={products ?? []}
      emptyText={term ? "Try a different word or browse all products." : undefined}
    />
  );
}
