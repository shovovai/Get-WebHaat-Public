# Review System API Migration

## Overview

Migrated user-facing review operations from direct server actions to API endpoints to resolve permission issues with Sanity client.

## Problem

Users encountered "Insufficient permissions; permission 'create' required" error when submitting reviews because the client-side Sanity client lacked write permissions.

## Solution

Created API endpoints that use server-side Sanity client with proper authentication token, while maintaining server actions for admin operations.

---

## Architecture Changes

### New Files Created

#### 1. `/app/api/user/reviews/route.ts`

API route handler with three endpoints:

- **GET** `/api/user/reviews?productId={id}`

  - Fetches approved reviews for a product
  - Returns reviews with rating statistics
  - Public endpoint (no auth required)

- **POST** `/api/user/reviews`

  - Submits a new review
  - Requires authentication (Clerk)
  - Validates user hasn't already reviewed
  - Creates review with "pending" status
  - Body: `{ productId, rating, title, content }`

- **PATCH** `/api/user/reviews`
  - Marks a review as helpful
  - Requires authentication (Clerk)
  - Toggles helpful status
  - Updates helpful count
  - Body: `{ reviewId }`

#### 2. `/lib/reviewAPI.ts`

Client-side service layer with TypeScript interfaces:

```typescript
// Submit a new review
submitReviewAPI(data: {
  productId: string;
  rating: number;
  title: string;
  content: string;
}): Promise<ReviewSubmissionResult>

// Get reviews for a product
getProductReviewsAPI(productId: string): Promise<ProductReviewsData>

// Mark review as helpful
markReviewHelpfulAPI(reviewId: string): Promise<{
  success: boolean;
  message: string;
}>
```

---

## Updated Components

### `/components/ReviewSidebar.tsx`

**Changes:**

- Import: `submitReview` → `submitReviewAPI`
- Function call: Updated `handleSubmit` to use API
- Error handling: Enhanced with better user feedback

**Before:**

```typescript
import { submitReview } from "@/actions/reviewActions";
const result = await submitReview(reviewData);
```

**After:**

```typescript
import { submitReviewAPI } from "@/lib/reviewAPI";
const result = await submitReviewAPI(reviewData);
```

### `/components/ProductReviews.tsx`

**Changes:**

- Imports: `getProductReviews` → `getProductReviewsAPI`, `markReviewHelpful` → `markReviewHelpfulAPI`
- Updated `loadReviews` function
- Updated `handleMarkHelpful` function

**Before:**

```typescript
import { getProductReviews, markReviewHelpful } from "@/actions/reviewActions";
const data = await getProductReviews(productId);
await markReviewHelpful(reviewId);
```

**After:**

```typescript
import { getProductReviewsAPI, markReviewHelpfulAPI } from "@/lib/reviewAPI";
const data = await getProductReviewsAPI(productId);
await markReviewHelpfulAPI(reviewId);
```

---

## What Remains Using Server Actions

### Admin Operations (Still Valid)

Admin components continue to use server actions directly:

- `/components/admin/AdminReviews.tsx`
  - `approveReview()`
  - `rejectReview()`
  - `getReviewsByStatus()`

**Why?** Admin operations run in a server context with proper permissions, so direct server actions work fine.

### Validation Check

- `canUserReviewProduct()` - Still used as server action
  - Checks if user has purchased the product
  - Validates if user already reviewed
  - No permission issues as it's read-only

---

## Permission Flow

### Before Migration

```
User Component → Server Action → Sanity Client (no write token) → ❌ Error
```

### After Migration

```
User Component → API Endpoint → Server-side Sanity Client (with token) → ✅ Success
```

### Admin Flow (Unchanged)

```
Admin Component → Server Action → Sanity Client (admin context) → ✅ Success
```

---

## Testing Checklist

- [ ] User can submit a review (goes to pending)
- [ ] Reviews display on product pages
- [ ] User can mark reviews as helpful
- [ ] Helpful count updates correctly
- [ ] Only approved reviews show to users
- [ ] Admin can approve/reject reviews
- [ ] Rating statistics update after approval
- [ ] Verified purchase badge shows correctly
- [ ] Authentication is enforced for protected actions
- [ ] Error messages display appropriately

---

## Benefits

1. **Security**: Server-side validation and authentication
2. **Permissions**: Proper Sanity client token usage
3. **Separation**: Clear boundary between user and admin operations
4. **Scalability**: API endpoints can be extended easily
5. **Error Handling**: Better error responses and user feedback
6. **Type Safety**: TypeScript interfaces for all API calls

---

## Migration Pattern

If you need to migrate other operations, follow this pattern:

1. Create API route in `/app/api/user/[feature]/route.ts`
2. Use `auth()` from Clerk for authentication
3. Use server-side Sanity client with proper token
4. Create client service in `/lib/[feature]API.ts`
5. Update components to use API service instead of server actions
6. Keep admin operations using server actions (if they work)

---

## Related Files

- API Route: `/app/api/user/reviews/route.ts`
- Client Service: `/lib/reviewAPI.ts`
- Server Actions: `/actions/reviewActions.ts` (admin operations)
- User Components: `ReviewSidebar.tsx`, `ProductReviews.tsx`
- Admin Components: `admin/AdminReviews.tsx` (unchanged)

---

Last Updated: ${new Date().toLocaleDateString()}
