# Review System Complete API Architecture

## Overview

Complete migration of review system to API-based architecture using Sanity `writeClient` for all mutations. Both user-facing and admin operations now use dedicated API endpoints with proper authentication and permission handling.

---

## Architecture

### API Endpoints

#### User Operations: `/app/api/user/reviews/route.ts`

**GET** - Fetch product reviews

- URL: `/api/user/reviews?productId={id}`
- Auth: Not required (public data)
- Returns: Approved reviews with statistics
- Uses: Read-only Sanity client

**POST** - Submit new review

- URL: `/api/user/reviews`
- Auth: Required (Clerk)
- Body: `{ productId, rating, title, content }`
- Validation: Checks for duplicate reviews
- Uses: `writeClient` for mutation
- Creates review with "pending" status

**PATCH** - Mark review as helpful

- URL: `/api/user/reviews`
- Auth: Required (Clerk)
- Body: `{ reviewId }`
- Uses: `writeClient` to toggle helpful status

#### Admin Operations: `/app/api/admin/reviews/route.ts`

**GET** - Fetch reviews by status

- URL: `/api/admin/reviews?status={pending|approved|rejected}`
- Auth: Required (Clerk + Admin role verification)
- Returns: Full review data with user and product details
- Uses: `writeClient` for data fetching

**PATCH** - Approve or reject review

- URL: `/api/admin/reviews`
- Auth: Required (Clerk + Admin role verification)
- Body: `{ reviewId, action: 'approve' | 'reject', adminNotes?: string }`
- Uses: `writeClient` for mutations
- On approval: Automatically recalculates product ratings

---

## Client API Services

### User Service: `/lib/reviewAPI.ts`

```typescript
// Submit a new review
export async function submitReviewAPI(data: {
  productId: string;
  rating: number;
  title: string;
  content: string;
}): Promise<ReviewSubmissionResult>;

// Get product reviews
export async function getProductReviewsAPI(
  productId: string
): Promise<ProductReviewsData>;

// Mark review helpful
export async function markReviewHelpfulAPI(
  reviewId: string
): Promise<{ success: boolean; message: string }>;
```

### Admin Service: `/lib/adminReviewAPI.ts`

```typescript
// Get reviews by status
export async function getReviewsByStatusAPI(
  status: "pending" | "approved" | "rejected"
): Promise<ReviewsByStatusResponse>;

// Approve review
export async function approveReviewAPI(
  reviewId: string,
  adminNotes?: string
): Promise<ReviewActionResponse>;

// Reject review
export async function rejectReviewAPI(
  reviewId: string,
  adminNotes?: string
): Promise<ReviewActionResponse>;
```

---

## Component Integration

### User Components

#### `ReviewSidebar.tsx` - Review submission

```typescript
import { submitReviewAPI } from "@/lib/reviewAPI";

const handleSubmit = async () => {
  const result = await submitReviewAPI({
    productId,
    rating,
    title,
    content,
  });
};
```

#### `ProductReviews.tsx` - Display reviews

```typescript
import { getProductReviewsAPI, markReviewHelpfulAPI } from "@/lib/reviewAPI";

const loadReviews = async () => {
  const data = await getProductReviewsAPI(productId);
};

const handleMarkHelpful = async (reviewId: string) => {
  await markReviewHelpfulAPI(reviewId);
};
```

#### `ProductCard.tsx` - Display ratings

```typescript
// Shows real data from product.averageRating and product.totalReviews
<div className="flex items-center">
  {[...Array(5)].map((_, index) => (
    <StarIcon
      fill={index < Math.round(product?.averageRating || 0)
        ? "#93D991"
        : "#ababab"}
    />
  ))}
</div>
<p>
  {product?.totalReviews
    ? `${product.totalReviews} ${product.totalReviews === 1 ? 'Review' : 'Reviews'}`
    : 'No Reviews'}
</p>
```

### Admin Components

#### `admin/AdminReviews.tsx` - Manage reviews

```typescript
import {
  getReviewsByStatusAPI,
  approveReviewAPI,
  rejectReviewAPI,
} from "@/lib/adminReviewAPI";

const loadPendingReviews = async () => {
  const data = await getReviewsByStatusAPI("pending");
  setPendingReviews(data.reviews);
};

const loadApprovedReviews = async () => {
  const data = await getReviewsByStatusAPI("approved");
  setApprovedReviews(data.reviews);
};

const handleApprove = async (reviewId: string) => {
  const result = await approveReviewAPI(reviewId);
};

const handleReject = async (reviewId: string) => {
  const result = await rejectReviewAPI(reviewId, rejectNotes);
};
```

---

## Key Features

### 1. Admin Role Verification

```typescript
// In admin API routes
const adminUser = await writeClient.fetch(
  `*[_type == "user" && clerkId == $userId && role == "admin"][0]`,
  { userId }
);

if (!adminUser) {
  return NextResponse.json(
    { error: "Forbidden - Admin access required" },
    { status: 403 }
  );
}
```

### 2. Automatic Rating Calculation

When a review is approved:

```typescript
// Get all approved reviews
const approvedReviews = await writeClient.fetch(...);

// Calculate statistics
const totalReviews = approvedReviews.length;
const averageRating = totalRating / totalReviews;
const distribution = calculateDistribution(approvedReviews);

// Update product using writeClient
await writeClient
  .patch(productId)
  .set({
    averageRating: Number(averageRating.toFixed(1)),
    totalReviews,
    ratingDistribution: distribution,
  })
  .commit();
```

### 3. Duplicate Review Prevention

```typescript
// Check if user already reviewed this product
const existingReview = await writeClient.fetch(
  `*[_type == "review" && user._ref == $userId && product._ref == $productId][0]`,
  { userId, productId }
);

if (existingReview) {
  return NextResponse.json(
    { error: "You have already reviewed this product" },
    { status: 400 }
  );
}
```

---

## Data Flow

### Review Submission Flow

```
1. User fills ReviewSidebar form
2. submitReviewAPI() called
3. POST /api/user/reviews
4. Verify authentication
5. Check for duplicate
6. Create review with writeClient (status: "pending")
7. Return success
```

### Review Approval Flow

```
1. Admin clicks approve in AdminReviews
2. approveReviewAPI() called
3. PATCH /api/admin/reviews { action: "approve" }
4. Verify admin authentication
5. Update review status with writeClient
6. Fetch all approved reviews for product
7. Calculate new statistics
8. Update product with writeClient
9. Return success
```

### Review Display Flow

```
1. ProductReviews component loads
2. getProductReviewsAPI() called
3. GET /api/user/reviews?productId=xyz
4. Fetch approved reviews
5. Calculate statistics
6. Return data
7. Component displays reviews
```

---

## Benefits

✅ **Consistent Permissions**: All mutations use `writeClient` with proper token
✅ **Security**: Server-side validation and authentication
✅ **Role-Based Access**: Admin endpoints verify user role
✅ **Type Safety**: Full TypeScript interfaces
✅ **Error Handling**: Comprehensive error messages
✅ **Automatic Updates**: Product ratings recalculate on approval
✅ **Scalability**: Easy to extend with new endpoints
✅ **Maintainability**: Centralized business logic

---

## Files Structure

```
app/
  api/
    user/
      reviews/
        route.ts          # User review operations
    admin/
      reviews/
        route.ts          # Admin review operations

lib/
  reviewAPI.ts            # User API client
  adminReviewAPI.ts       # Admin API client

components/
  ReviewSidebar.tsx       # Submit reviews (uses reviewAPI)
  ProductReviews.tsx      # Display reviews (uses reviewAPI)
  ProductCard.tsx         # Show ratings (uses product data)
  admin/
    AdminReviews.tsx      # Manage reviews (uses adminReviewAPI)

sanity/
  lib/
    client.ts             # Regular client (read-only)
    writeClient.ts        # Write client (mutations)
```

---

## Migration Checklist

- [x] Create user API endpoints
- [x] Create admin API endpoints
- [x] Create user API client service
- [x] Create admin API client service
- [x] Update ReviewSidebar to use API
- [x] Update ProductReviews to use API
- [x] Update AdminReviews to use API
- [x] Update ProductCard to show real data
- [x] Use writeClient for all mutations
- [x] Add admin role verification
- [x] Add duplicate review prevention
- [x] Implement automatic rating calculation
- [x] Test user review submission
- [x] Test admin approval workflow
- [x] Test admin rejection workflow
- [x] Verify rating updates
- [x] Check error handling

---

## Testing Guide

### User Flow Test

1. Navigate to product page
2. Click "Write a Review"
3. Fill in rating, title, content
4. Submit → Should see "Review submitted for approval"
5. Check admin panel → Review appears in "Pending"

### Admin Approval Test

1. Go to /admin/reviews
2. See pending review
3. Click "Approve"
4. Review moves to "Approved" tab
5. Check product page → Review now visible
6. Check product card → Rating count updated

### Admin Rejection Test

1. Go to /admin/reviews (pending tab)
2. Click "Reject" on a review
3. Add optional admin notes
4. Confirm rejection
5. Review disappears from pending

### Rating Calculation Test

1. Approve multiple reviews with different ratings
2. Check product data in Sanity
3. Verify averageRating is correct
4. Verify totalReviews count is accurate
5. Verify ratingDistribution is correct

---

Last Updated: ${new Date().toLocaleDateString()}
