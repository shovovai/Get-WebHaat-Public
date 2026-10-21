import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { client } from "@/sanity/lib/client";
import { Product } from "@/sanity.types";
import ProductBrowser from "@/components/listing/ProductBrowser";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 300;

const QUERY = `{
  "brand": *[_type == "brand" && slug.current == $slug][0]{ _id, title, description, image },
  "products": *[_type == "product" && brand->slug.current == $slug]
    | order(isFeatured desc, name asc){ ..., "categories": categories[]->title },
  "siblings": *[_type == "brand"] | order(title asc){ title, "slug": slug.current }
}`;

async function load(slug: string) {
  return client.fetch<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    brand: any;
    products: Product[];
    siblings: { title: string; slug: string }[];
  }>(QUERY, { slug });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { brand, products } = await load(slug);
  if (!brand) return { title: "Brand not found" };
  return {
    title: `${brand.title} products`,
    description: brand.description || `Shop ${products.length} ${brand.title} products.`,
  };
}

export default async function BrandPage({ params }: Props) {
  const { slug } = await params;
  const { brand, products, siblings } = await load(slug);
  if (!brand) notFound();

  return (
    <ProductBrowser
      title={brand.title}
      description={brand.description}
      products={products}
      breadcrumb={[{ label: "Home", href: "/" }, { label: "Brands", href: "/brands" }, { label: brand.title }]}
      subnav={[
        { title: "All brands", href: "/brands" },
        ...siblings.map((s) => ({ title: s.title, href: `/brands/${s.slug}`, active: s.slug === slug })),
      ]}
    />
  );
}
