import Link from "next/link";
import dayjs from "dayjs";
import { image } from "@/sanity/image";
import { sanityImgProps } from "@/lib/sanityImage";
import { cn } from "@/lib/utils";

type Img = Parameters<typeof image>[0];

export interface ArticleSummary {
  _id: string;
  title?: string | null;
  slug?: { current?: string } | null;
  mainImage?: Img | null;
  publishedAt?: string | null;
  blogcategories?: { title?: string | null }[] | null;
}

const LARGE = {
  widths: [640, 960, 1200, 1600],
  sizes: "(min-width: 1280px) 730px, (min-width: 1024px) 57vw, 100vw",
  ratio: 10 / 16,
} as const;
/** 1 / 2 / 3 columns in the 1280px container */
const SMALL = {
  widths: [360, 540, 700, 1000],
  sizes: "(min-width: 1280px) 400px, (min-width: 1024px) 31vw, (min-width: 640px) 50vw, 100vw",
  ratio: 2 / 3,
} as const;

/** Journal article teaser: photo, category, title, date */
export default function ArticleCard({ article, large }: { article: ArticleSummary; large?: boolean }) {
  const href = `/blog/${article.slug?.current}`;
  const category = article.blogcategories?.[0]?.title;

  return (
    <Link href={href} className={cn("group block", large && "lg:grid lg:grid-cols-[1.4fr_1fr] lg:items-center lg:gap-12")}>
      <div className={cn("overflow-hidden rounded-lg bg-sand", large ? "aspect-[16/10]" : "aspect-[3/2]")}>
        {article.mainImage && (
          <img
            {...sanityImgProps(article.mainImage, large ? LARGE : SMALL)}
            alt=""
            // The large (featured) card sits at the top of the journal page
            loading={large ? "eager" : "lazy"}
            fetchPriority={large ? "high" : undefined}
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        )}
      </div>
      <div className={large ? "mt-5 lg:mt-0" : "mt-4"}>
        {category && (
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-light-color">{category}</p>
        )}
        <h2
          className={cn(
            "mt-2 leading-snug text-ink group-hover:underline",
            large ? "text-[28px] sm:text-[36px]" : "line-clamp-2 text-xl"
          )}
        >
          {article.title}
        </h2>
        {article.publishedAt && (
          <p className="mt-2 text-[15px] text-light-color">{dayjs(article.publishedAt).format("D MMMM YYYY")}</p>
        )}
        {large && <span className="mt-5 inline-block text-[15px] text-ink underline underline-offset-4">Read article</span>}
      </div>
    </Link>
  );
}
