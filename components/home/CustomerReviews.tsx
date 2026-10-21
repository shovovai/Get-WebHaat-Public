import Link from "next/link";
import { BadgeCheck, Star } from "lucide-react";
import { image } from "@/sanity/image";
import type { HomeReview } from "@/lib/homeData";
import Container from "../Container";
import SectionHeading from "../SectionHeading";

// First name + last initial only
const displayName = (r: HomeReview) =>
  [r.firstName?.trim(), r.lastName?.trim()?.charAt(0) ? `${r.lastName.trim().charAt(0)}.` : ""]
    .filter(Boolean)
    .join(" ") || "Customer";

const CustomerReviews = ({ reviews }: { reviews: HomeReview[] }) => {
  if (!reviews.length) return null;

  return (
    <section className="mt-16 bg-sand py-14 sm:mt-20 sm:py-20">
      <Container>
        <SectionHeading
          eyebrow="Real reviews"
          title="What shoppers are saying"
          description="Approved reviews from people who bought from us."
        />
        <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 scrollbar-hide lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0 lg:pb-0">
          {reviews.map((review) => (
            <figure
              key={review._id}
              className="flex w-[85%] shrink-0 snap-start flex-col rounded-[1.5rem] bg-white p-6 ring-1 ring-ink/5 sm:w-[60%] lg:w-auto"
            >
              <div className="flex gap-0.5" aria-label={`${review.rating} out of 5 stars`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={n <= review.rating ? "h-4 w-4 fill-marigold text-marigold" : "h-4 w-4 text-ink/15"}
                  />
                ))}
              </div>
              <div className="flex-1">
                {review.title && <p className="mt-4 font-semibold text-ink">{review.title}</p>}
                <blockquote className="mt-2 line-clamp-5 text-sm leading-relaxed text-light-color">
                  &ldquo;{review.content}&rdquo;
                </blockquote>
              </div>
              <figcaption className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{displayName(review)}</p>
                  {review.isVerifiedPurchase && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-sage">
                      <BadgeCheck className="h-3.5 w-3.5" /> Verified purchase
                    </p>
                  )}
                </div>
                {review.product?.slug && (
                  <Link
                    href={`/product/${review.product.slug}`}
                    className="flex min-w-0 items-center gap-2 rounded-full bg-cream py-1 pl-1 pr-3 text-xs font-medium text-ink/80 hover:text-clay"
                  >
                    {review.product.image && (
                      <img
                        src={image(review.product.image).size(64, 64).url()}
                        alt=""
                        width={28}
                        height={28}
                        loading="lazy"
                        decoding="async"
                        className="h-7 w-7 shrink-0 rounded-full bg-white object-contain"
                      />
                    )}
                    <span className="line-clamp-1 max-w-[7rem]">{review.product.name}</span>
                  </Link>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      </Container>
    </section>
  );
};

export default CustomerReviews;
