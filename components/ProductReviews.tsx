"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StarIcon, ThumbsUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import ReviewSidebar from "./ReviewSidebar";
import { markReviewHelpfulAPI, type ProductReviewsData } from "@/lib/reviewAPI";
import { canUserReviewProduct } from "@/actions/reviewActions";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";

interface Review {
  _id: string;
  rating: number;
  title: string;
  content: string;
  helpful: number;
  isVerifiedPurchase: boolean;
  createdAt: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    profileImage?: {
      asset: {
        url: string;
      };
    };
  };
}

interface ProductReviewsProps {
  productId: string;
  productName: string;
}

const EMPTY_REVIEWS: ProductReviewsData = {
  reviews: [],
  averageRating: 0,
  totalReviews: 0,
  ratingDistribution: { fiveStars: 0, fourStars: 0, threeStars: 0, twoStars: 0, oneStar: 0 },
};

// Reviews come from the cached product page query (latest approved ones),
// handed down by the server page — no request when the page loads.
const ProductReviewsContext = createContext<ProductReviewsData | null>(null);

export function ProductReviewsProvider({
  value,
  children,
}: {
  value: ProductReviewsData;
  children: React.ReactNode;
}) {
  return <ProductReviewsContext.Provider value={value}>{children}</ProductReviewsContext.Provider>;
}

const ProductReviews = React.memo(
  ({ productId, productName }: ProductReviewsProps) => {
    const { isSignedIn } = useAuth();
    const initial = useContext(ProductReviewsContext) ?? EMPTY_REVIEWS;
    const [reviews, setReviews] = useState<Review[]>(initial.reviews as Review[]);
    const { averageRating, totalReviews, ratingDistribution } = initial;
    const [hasPurchased, setHasPurchased] = useState(false);
    const [hasReviewed, setHasReviewed] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const [isReviewSidebarOpen, setIsReviewSidebarOpen] = useState(false);

    const handleMarkHelpful = useCallback(
      async (reviewId: string) => {
        if (!isSignedIn) {
          toast.error("Please sign in to mark reviews as helpful");
          return;
        }

        try {
          const result = await markReviewHelpfulAPI(reviewId);
          if (result.success) {
            // Update the count locally (the cached page refreshes via the Sanity webhook)
            const delta = /unmarked/i.test(result.message) ? -1 : 1;
            setReviews((list) =>
              list.map((r) => (r._id === reviewId ? { ...r, helpful: Math.max(0, (r.helpful || 0) + delta) } : r))
            );
          } else {
            toast.error(result.message);
          }
        } catch (error) {
          console.error("Error marking review as helpful:", error);
          toast.error("Failed to update review");
        }
      },
      [isSignedIn]
    );

    const displayedReviews = showAll ? reviews : reviews.slice(0, 3);

    const ratingData = [
      { stars: 5, count: ratingDistribution.fiveStars },
      { stars: 4, count: ratingDistribution.fourStars },
      { stars: 3, count: ratingDistribution.threeStars },
      { stars: 2, count: ratingDistribution.twoStars },
      { stars: 1, count: ratingDistribution.oneStar },
    ];

    // Eligibility is only checked when a signed-in shopper asks to write a review
    const handleOpenReviewSidebar = useCallback(async () => {
      if (!isSignedIn) {
        toast.error("Please sign in to write a review");
        return;
      }
      setIsChecking(true);
      try {
        const result = await canUserReviewProduct(productId);
        setHasPurchased(result.hasPurchased);
        if (result.hasAlreadyReviewed) {
          setHasReviewed(true);
          toast.error("You have already reviewed this product");
          return;
        }
        if (!result.canReview) {
          toast.error("You can't review this product right now");
          return;
        }
        setIsReviewSidebarOpen(true);
      } catch (error) {
        console.error("Error checking review eligibility:", error);
        toast.error("Please try again in a moment");
      } finally {
        setIsChecking(false);
      }
    }, [isSignedIn, productId]);

    const handleCloseReviewSidebar = useCallback(() => {
      setIsReviewSidebarOpen(false);
    }, []);

    const handleReviewSubmitted = useCallback(() => {
      // New reviews wait for admin approval, so there is nothing to reload
      setHasReviewed(true);
    }, []);

    const canReview = !hasReviewed;

    return (
      <div className="mt-12">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-shop_dark_green">
              Customer Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Rating Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Overall Rating */}
              <div className="text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                  <span className="text-4xl font-bold text-shop_dark_green">
                    {averageRating.toFixed(1)}
                  </span>
                  <div className="flex items-center">
                    {[...Array(5)].map((_, index) => (
                      <StarIcon
                        key={index}
                        size={20}
                        className={`${
                          index < Math.floor(averageRating)
                            ? "text-shop_light_green fill-shop_light_green"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-gray-600">
                  {totalReviews === 0
                    ? "No reviews yet"
                    : `Based on ${totalReviews} ${
                        totalReviews === 1 ? "review" : "reviews"
                      }`}
                </p>
                {isSignedIn ? (
                  canReview ? (
                    <Button
                      onClick={handleOpenReviewSidebar}
                      disabled={isChecking}
                      className="mt-4 bg-shop_dark_green hover:bg-shop_light_green text-white"
                      size="sm"
                    >
                      Write a Review
                    </Button>
                  ) : hasReviewed ? (
                    <p className="mt-4 text-sm text-gray-500">
                      You have already reviewed this product
                    </p>
                  ) : null
                ) : (
                  <p className="mt-4 text-sm text-gray-500">
                    Sign in to write a review
                  </p>
                )}
              </div>

              {/* Rating Distribution */}
              <div className="space-y-2">
                {ratingData.map((rating) => {
                  const percentage =
                    totalReviews > 0 ? (rating.count / totalReviews) * 100 : 0;
                  return (
                    <div key={rating.stars} className="flex items-center gap-2">
                      <span className="text-sm w-8">{rating.stars}★</span>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-shop_light_green rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-8">
                        {rating.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Individual Reviews */}
            {reviews.length > 0 ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-shop_dark_green">
                    Recent Reviews ({totalReviews})
                  </h3>
                  {reviews.length > 3 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAll(!showAll)}
                    >
                      {showAll ? "Show Less" : "View All Reviews"}
                    </Button>
                  )}
                </div>

                {displayedReviews.map((review) => (
                  <div
                    key={review._id}
                    className="border-b border-gray-200 pb-6 last:border-b-0"
                  >
                    <div className="flex items-start gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={review.user?.profileImage?.asset?.url}
                          alt={`${review.user?.firstName} ${review.user?.lastName}`}
                        />
                        <AvatarFallback className="bg-shop_light_green/10 text-shop_dark_green">
                          {review.user?.firstName?.[0]}
                          {review.user?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-shop_dark_green">
                            {review.user?.firstName} {review.user?.lastName}
                          </h4>
                          {review.isVerifiedPurchase && (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-200 text-xs">
                              Verified Purchase
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, index) => (
                              <StarIcon
                                key={index}
                                size={14}
                                className={`${
                                  index < review.rating
                                    ? "text-shop_light_green fill-shop_light_green"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-gray-600">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <h5 className="font-medium mb-2">{review.title}</h5>
                        <p className="text-gray-700 mb-3 leading-relaxed">
                          {review.content}
                        </p>

                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <button
                            onClick={() => handleMarkHelpful(review._id)}
                            className="flex items-center gap-1 hover:text-shop_light_green transition-colors disabled:opacity-50"
                            disabled={!isSignedIn}
                          >
                            <ThumbsUp size={14} />
                            Helpful ({review.helpful})
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">
                  No reviews yet. Be the first to review this product!
                </p>
                {isSignedIn && canReview && (
                  <Button
                    onClick={handleOpenReviewSidebar}
                    disabled={isChecking}
                    className="bg-shop_dark_green hover:bg-shop_light_green text-white"
                  >
                    Write the First Review
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Review Sidebar */}
        <ReviewSidebar
          productId={productId}
          productName={productName}
          isVerifiedPurchase={hasPurchased}
          isOpen={isReviewSidebarOpen}
          onClose={handleCloseReviewSidebar}
          onReviewSubmitted={handleReviewSubmitted}
        />
      </div>
    );
  }
);

ProductReviews.displayName = "ProductReviews";

export default ProductReviews;
