import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import { Breadcrumbs } from "@/components/listing/ProductBrowser";
import ArticleCard, { type ArticleSummary } from "@/components/blog/ArticleCard";
import { getAllBlogs } from "@/sanity/queries";

export const metadata: Metadata = {
  title: "Journal",
  description: "Stories, guides and news from our team.",
};

export default async function BlogPage() {
  const articles = ((await getAllBlogs(24)) ?? []) as unknown as ArticleSummary[];
  const [featured, ...rest] = articles;

  return (
    <Container className="py-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Journal" }]} />
      <h1 className="mb-10 mt-6 text-[34px] leading-tight text-ink sm:text-[44px]">Journal</h1>

      {!featured ? (
        <div className="rounded-lg bg-white px-6 py-20 text-center">
          <p className="text-[28px] text-ink">Stories are coming soon</p>
          <p className="mt-2 text-base text-light-color">In the meantime, explore the latest arrivals.</p>
          <Link href="/shop" className="mt-8 inline-flex h-12 items-center rounded-md bg-ink px-8 text-base font-medium text-white">
            Shop new in
          </Link>
        </div>
      ) : (
        <>
          <ArticleCard article={featured} large />
          {rest.length > 0 && (
            <div className="mt-16 grid gap-x-6 gap-y-12 border-t border-black/10 pt-12 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((a) => (
                <ArticleCard key={a._id} article={a} />
              ))}
            </div>
          )}
        </>
      )}
    </Container>
  );
}
