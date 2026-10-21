import type { Metadata } from "next";
import { client } from "@/sanity/lib/client";
import type { Product } from "@/sanity.types";
import ProductBrowser from "@/components/listing/ProductBrowser";

export const metadata: Metadata = {
  title: "Sale",
  description: "Discounted and trending products — limited-time prices while stock lasts.",
};

export const revalidate = 300;

// Everything on sale: discounted, marked "sale" or "hot" in the admin panel
const QUERY = `*[_type == "product" && (status in ["hot", "sale"] || (discount > 0 && discount < 100))]
  | order(discount desc, _updatedAt desc){ ..., "categories": categories[]->title }`;

export default async function SalePage() {
  const products = await client.fetch<Product[]>(QUERY).catch(() => []);
  const best = Math.max(0, ...products.map((p) => (p.discount && p.discount < 100 ? p.discount : 0)));

  return (
    <ProductBrowser
      title="Sale"
      description={best > 0 ? `Save up to ${best}% on selected products while stock lasts.` : undefined}
      breadcrumb={[{ label: "Home", href: "/" }, { label: "Sale" }]}
      products={products}
      promo={best > 0 ? `Up to ${best}% off — limited time only` : null}
      emptyText="There are no offers right now — check back soon."
    />
  );
}
