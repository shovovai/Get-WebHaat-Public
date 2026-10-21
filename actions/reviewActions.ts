"use server";

import { client } from "@/sanity/lib/client";
import { auth } from "@clerk/nextjs/server";

// Reviews are submitted through the validated POST /api/user/reviews
// (lib/reviewAPI.ts → submitReviewAPI) and read from the cached product page
// query; "helpful" votes go through PATCH /api/user/reviews.

// Check if user can review a product
export async function canUserReviewProduct(productId: string): Promise<{
  canReview: boolean;
  hasAlreadyReviewed: boolean;
  hasPurchased: boolean;
}> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return {
        canReview: false,
        hasAlreadyReviewed: false,
        hasPurchased: false,
      };
    }

    // Get the user from Sanity
    const sanityUser = await client.fetch(
      `*[_type == "user" && clerkUserId == $clerkUserId][0]{
        _id
      }`,
      { clerkUserId: userId }
    );

    if (!sanityUser) {
      return {
        canReview: false,
        hasAlreadyReviewed: false,
        hasPurchased: false,
      };
    }

    // Check if user has already reviewed this product
    const hasAlreadyReviewed = await client.fetch(
      `count(*[_type == "review" && user._ref == $userId && product._ref == $productId]) > 0`,
      { userId: sanityUser._id, productId }
    );

    // Check if user has purchased this product
    const hasPurchased = await client.fetch(
      `count(*[_type == "order" && user._ref == $userId && status == "delivered" && $productId in products[].product._ref]) > 0`,
      { userId: sanityUser._id, productId }
    );

    return {
      canReview: !hasAlreadyReviewed,
      hasAlreadyReviewed,
      hasPurchased,
    };
  } catch (error) {
    console.error("Error checking if user can review product:", error);
    return {
      canReview: false,
      hasAlreadyReviewed: false,
      hasPurchased: false,
    };
  }
}
