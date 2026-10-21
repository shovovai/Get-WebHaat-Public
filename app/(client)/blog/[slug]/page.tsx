import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import dayjs from "dayjs";
import { PortableText, type PortableTextComponents } from "next-sanity";
import Container from "@/components/Container";
import { Breadcrumbs } from "@/components/listing/ProductBrowser";
import ArticleCard, { type ArticleSummary } from "@/components/blog/ArticleCard";
import { getOthersBlog, getSingleBlog } from "@/sanity/queries";
import { image } from "@/sanity/image";
import type { SINGLE_BLOG_QUERYResult } from "@/sanity.types";

type Props = { params: Promise<{ slug: string }> };

// Rich text styling for articles
const components: PortableTextComponents = {
  block: {
    normal: ({ children }) => <p className="my-6 text-[17px] leading-8 text-ink/85">{children}</p>,
    h2: ({ children }) => <h2 className="mb-4 mt-12 text-[28px] leading-tight text-ink">{children}</h2>,
    h3: ({ children }) => <h3 className="mb-3 mt-10 text-2xl text-ink">{children}</h3>,
    h4: ({ children }) => <h4 className="mb-3 mt-8 text-xl text-ink">{children}</h4>,
    blockquote: ({ children }) => (
      <blockquote className="my-8 border-l-2 border-ink pl-6 text-xl italic leading-8 text-ink">{children}</blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => <ul className="my-6 list-disc space-y-2 pl-6 text-[17px] leading-8 text-ink/85">{children}</ul>,
    number: ({ children }) => <ol className="my-6 list-decimal space-y-2 pl-6 text-[17px] leading-8 text-ink/85">{children}</ol>,
  },
  marks: {
    link: ({ children, value }) => {
      const href = typeof value?.href === "string" ? value.href : "#";
      const external = /^https?:\/\//.test(href);
      return (
        <a
          href={href}
          className="text-ink underline underline-offset-4"
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {children}
        </a>
      );
    },
  },
  types: {
    image: ({ value }) =>
      value?.asset ? (
        <img src={image(value).width(1400).url()} alt={value.alt || ""} loading="lazy" className="my-10 w-full rounded-lg" />
      ) : null,
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const blog = (await getSingleBlog(slug)) as SINGLE_BLOG_QUERYResult | null;
  if (!blog) return { title: "Article not found" };
  return {
    title: blog.title || "Journal",
    openGraph: blog.mainImage ? { images: [image(blog.mainImage).width(1200).height(630).fit("crop").url()] } : undefined,
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const blog = (await getSingleBlog(slug)) as SINGLE_BLOG_QUERYResult | null;
  if (!blog) notFound();

  const more = ((await getOthersBlog(slug, 3)) ?? []) as unknown as ArticleSummary[];

  // ~200 words per minute
  const words = (blog.body ?? []).reduce((n, block) => {
    const children = "children" in block ? (block.children ?? []) : [];
    return n + children.reduce((m, c) => m + (c.text ? c.text.split(/\s+/).length : 0), 0);
  }, 0);
  const minutes = Math.max(1, Math.ceil(words / 200));
  const category = blog.blogcategories?.[0]?.title;

  return (
    <Container className="py-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Journal", href: "/blog" }, { label: blog.title || "Article" }]} />

      <article className="mx-auto mt-10 max-w-3xl">
        <header className="text-center">
          {category && <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-light-color">{category}</p>}
          <h1 className="mt-3 text-[34px] leading-tight text-ink sm:text-[48px]">{blog.title}</h1>
          <p className="mt-4 text-[15px] text-light-color">
            {blog.publishedAt && dayjs(blog.publishedAt).format("D MMMM YYYY")}
            {blog.publishedAt && " · "}
            {minutes} min read
            {blog.author?.name && ` · ${blog.author.name}`}
          </p>
        </header>

        {blog.mainImage && (
          <div className="mt-10 overflow-hidden rounded-lg bg-sand">
            <img
              src={image(blog.mainImage).width(1600).height(1000).fit("crop").url()}
              alt=""
              className="aspect-[16/10] w-full object-cover"
            />
          </div>
        )}

        <div className="mx-auto mt-10 max-w-2xl">
          {blog.body ? <PortableText value={blog.body} components={components} /> : null}
        </div>

        <div className="mx-auto mt-12 max-w-2xl border-t border-black/10 pt-6">
          <Link href="/blog" className="text-[15px] text-ink underline underline-offset-4">
            ← Back to the journal
          </Link>
        </div>
      </article>

      {more.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-8 text-[28px] text-ink sm:text-4xl">More from the journal</h2>
          <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((a) => (
              <ArticleCard key={a._id} article={a} />
            ))}
          </div>
        </section>
      )}
    </Container>
  );
}
