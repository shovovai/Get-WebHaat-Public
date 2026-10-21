import Container from "./Container";
import SectionHeading from "./SectionHeading";
import ArticleCard, { type ArticleSummary } from "./blog/ArticleCard";
import { getLatestBlogs } from "@/sanity/queries";

/** "From the journal" — latest three articles */
const LatestBlog = async () => {
  const articles = ((await getLatestBlogs()) ?? []).slice(0, 3) as unknown as ArticleSummary[];
  if (!articles.length) return null;

  return (
    <Container className="mt-16 sm:mt-24">
      <SectionHeading title="From the journal" href="/blog" />
      <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((a) => (
          <ArticleCard key={a._id} article={a} />
        ))}
      </div>
    </Container>
  );
};

export default LatestBlog;
