import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import { Breadcrumbs } from "@/components/listing/ProductBrowser";
import { client } from "@/sanity/lib/client";
import { image } from "@/sanity/image";

export const metadata: Metadata = {
  title: "All categories",
  description: "Browse every category in the store.",
};
export const revalidate = 300;

type Img = Parameters<typeof image>[0];

export default async function CategoriesPage() {
  const categories = await client.fetch<
    { _id: string; title: string; slug: string; cover?: Img; count: number }[]
  >(`*[_type == "category" && defined(slug.current)] | order(title asc){
    _id, title, "slug": slug.current,
    "cover": coalesce(image, *[_type == "product" && references(^._id) && defined(images[0])][0].images[0]),
    "count": count(*[_type == "product" && references(^._id)])
  }`);

  return (
    <Container className="py-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Categories" }]} />
      <div className="mb-10 mt-6 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-[32px] leading-tight text-ink sm:text-[44px]">Shop by category</h1>
        <Link href="/shop" className="text-[15px] font-medium text-ink underline underline-offset-4">
          Explore All
        </Link>
      </div>

      {categories.length === 0 ? (
        <div className="rounded-lg bg-white px-6 py-20 text-center">
          <p className="text-2xl text-ink">Categories are coming soon</p>
          <p className="mt-2 text-[15px] text-light-color">Meanwhile, browse everything in the store.</p>
          <Link href="/shop" className="mt-6 inline-block text-[15px] text-ink underline underline-offset-4">
            Shop all products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          {categories.map((c) => (
            <Link
              key={c._id}
              href={`/category/${c.slug}`}
              className="group relative block aspect-[4/5] overflow-hidden rounded-lg bg-[#d9d9de]"
            >
              {c.cover && (
                <img
                  src={image(c.cover).width(600).height(750).fit("crop").url()}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                <h2 className="text-xl leading-tight text-white sm:text-[26px]">{c.title}</h2>
                <p className="mt-1 text-sm text-white/75">
                  {c.count} item{c.count === 1 ? "" : "s"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Container>
  );
}
