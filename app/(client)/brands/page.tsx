import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import { Breadcrumbs } from "@/components/listing/ProductBrowser";
import { client } from "@/sanity/lib/client";
import { image } from "@/sanity/image";

export const metadata: Metadata = {
  title: "Brands",
  description: "Shop products from the brands we carry.",
};
export const revalidate = 300;

type Img = Parameters<typeof image>[0];

export default async function BrandsPage() {
  const brands = await client.fetch<
    { _id: string; title: string; slug: string; description?: string; image?: Img; count: number }[]
  >(`*[_type == "brand" && defined(slug.current)] | order(title asc){
    _id, title, "slug": slug.current, description, image,
    "count": count(*[_type == "product" && brand._ref == ^._id])
  }`);

  return (
    <Container className="py-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Brands" }]} />
      <div className="mb-10 mt-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-light-color">Discover</p>
        <h1 className="mt-2 text-[32px] leading-tight text-ink sm:text-[44px]">Our brands</h1>
      </div>

      {brands.length === 0 ? (
        <div className="rounded-lg bg-white px-6 py-20 text-center">
          <p className="text-2xl text-ink">Brands are coming soon</p>
          <Link href="/shop" className="mt-6 inline-block text-[15px] text-ink underline underline-offset-4">
            Shop all products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {brands.map((b) => (
            <Link
              key={b._id}
              href={`/brands/${b.slug}`}
              className="group flex h-80 flex-col items-center justify-between rounded-lg bg-gradient-to-b from-[#4a4a4c] to-[#1c1c1e] p-7 text-center text-white transition-transform duration-500 hover:-translate-y-1"
            >
              <div className="flex h-20 w-full items-center justify-center">
                {b.image && (
                  <img
                    src={image(b.image).width(320).url()}
                    alt={`${b.title} logo`}
                    loading="lazy"
                    className="max-h-16 max-w-[80%] object-contain brightness-0 invert"
                  />
                )}
              </div>
              {b.description && <p className="line-clamp-4 text-sm leading-relaxed text-white/70">{b.description}</p>}
              <div>
                <p className="text-sm uppercase tracking-[0.35em]">{b.title}</p>
                <p className="mt-1 text-xs text-white/50">
                  {b.count} item{b.count === 1 ? "" : "s"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Container>
  );
}
