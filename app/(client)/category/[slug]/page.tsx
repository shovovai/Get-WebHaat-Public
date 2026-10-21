import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { client } from "@/sanity/lib/client";
import { Product } from "@/sanity.types";
import ProductBrowser from "@/components/listing/ProductBrowser";
import {
  generateBreadcrumbSchema,
  generateCategoryMetadata,
  generateItemListSchema,
} from "@/lib/seo";
import { jsonLd } from "@/lib/jsonLd";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 300;

const QUERY = `{
  "category": *[_type == "category" && slug.current == $slug][0]{ _id, title, slug, description, image },
  "products": *[_type == "product" && references(*[_type == "category" && slug.current == $slug]._id)]
    | order(isFeatured desc, name asc){ ..., "categories": categories[]->title, brand->{_id, title} },
  "siblings": *[_type == "category"] | order(title asc){ title, "slug": slug.current }
}`;

async function load(slug: string) {
  return client.fetch<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    category: any;
    products: Product[];
    siblings: { title: string; slug: string }[];
  }>(QUERY, { slug });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { category, products } = await load(slug);
  if (!category) return { title: "Category not found" };
  return generateCategoryMetadata(category, products.length);
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const { category, products, siblings } = await load(slug);
  if (!category) notFound();

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Categories", url: "/category" },
    { name: category.title, url: `/category/${slug}` },
  ]);
  const itemListSchema = generateItemListSchema(products, `${category.title} products`);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(itemListSchema) }} />
      <ProductBrowser
        title={category.title}
        description={category.description}
        products={products}
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Categories", href: "/category" }, { label: category.title }]}
        subnav={[
          { title: "All", href: "/shop" },
          ...siblings.map((s) => ({ title: s.title, href: `/category/${s.slug}`, active: s.slug === slug })),
        ]}
      />
    </>
  );
}
