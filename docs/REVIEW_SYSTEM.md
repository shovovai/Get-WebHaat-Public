# Product Reviews System Documentation

## Overview

This document describes the complete product review system implementation with admin approval workflow, verified purchase badges, and automatic rating calculations.

## Features

### 1. User Review Submission

- **Authentication Required**: Users must be logged in to submit reviews
- **One Review Per Product**: Each user can only review a product once
- **Verified Purchase Detection**: System automatically detects if the review is from a verified purchaser
- **Validation**:
  - Rating: 1-5 stars (required)
  - Title: 5-100 characters (required)
  - Content: 20-1000 characters (required)

### 2. Admin Approval Workflow

- All reviews start with "pending" status
- Admins can:
  - View all pending reviews in the admin dashboard
  - Preview how reviews will appear on product pages
  - Approve reviews (changes status to "approved")
  - Reject reviews with optional internal notes
- Only approved reviews appear on product pages

### 3. Automatic Rating Calculations

When a review is approved, the system automatically:

- Recalculates the product's average rating
- Updates the total review count
- Updates the rating distribution (1-5 stars breakdown)
- All calculations are stored in the product document for fast retrieval

### 4. Helpful Reviews

- Users can mark reviews as helpful
- Each user can only mark a review as helpful once
- Can toggle helpful status (mark/unmark)
- Helpful count is displayed with each review

## Technical Implementation

### Schema Types

#### Review Type (`reviewType.ts`)

```typescript
{
  _type: "review",
  product: reference to product,
  user: reference to user,
  rating: number (1-5),
  title: string,
  content: text,
  isVerifiedPurchase: boolean,
  status: "pending" | "approved" | "rejected",
  helpful: number,
  helpfulBy: array of user references,
  adminNotes: text (optional),
  createdAt: datetime,
  updatedAt: datetime,
  approvedAt: datetime,
  approvedBy: string
}
```

#### Product Type Updates

Added to `productType.ts`:

```typescript
{
  averageRating: number (0-5, calculated),
  totalReviews: number (calculated),
  ratingDistribution: {
    fiveStars: number,
    fourStars: number,
    threeStars: number,
    twoStars: number,
    oneStar: number
  }
}
```

### Server Actions (`reviewActions.ts`)

#### User Actions:

1. **`submitReview(data)`**

   - Validates user authentication
   - Checks for duplicate reviews
   - Detects verified purchase status
   - Creates review with "pending" status

2. **`getProductReviews(productId)`**

   - Fetches all approved reviews for a product
   - Calculates rating statistics
   - Updates product with latest ratings
   - Returns reviews with user details

3. **`markReviewHelpful(reviewId)`**

   - Toggles helpful status for a review
   - Prevents duplicate helpful marks
   - Updates helpful count

4. **`canUserReviewProduct(productId)`**
   - Checks if user is logged in
   - Checks if user has already reviewed
   - Checks if user has purchased the product
   - Returns eligibility status

#### Admin Actions:

1. **`approveReview(reviewId, adminEmail)`**

   - Changes review status to "approved"
   - Records approval timestamp and admin
   - Triggers rating recalculation

2. **`rejectReview(reviewId, adminNotes)`**

   - Changes review status to "rejected"
   - Stores optional admin notes
   - Review won't appear on product pages

3. **`getPendingReviews()`**
   - Fetches all reviews with "pending" status
   - Returns reviews with user and product details
   - Used in admin dashboard

### Components

#### 1. ReviewSidebar (`ReviewSidebar.tsx`)

- Slide-out sidebar form for submitting reviews (replaces modal dialog)
- Star rating selector with hover effects and visual progress bar
- Character counters with validation feedback for title and content
- Shows verified purchase status when applicable
- Real-time validation with visual indicators
- Review guidelines displayed within the form
- Smooth animations and transitions
- Optimized with React.memo and useCallback
- Auto-resets form on close or successful submission

**Features:**

- Large, accessible star rating buttons
- Progress bar showing rating percentage
- Color-coded validation messages (red for errors, green for success)
- Disabled state during submission
- Responsive design for mobile and desktop
- Guidelines section to help users write better reviews

#### 2. ProductReviews (`ProductReviews.tsx`)

- Displays product rating summary
- Shows rating distribution chart
- Lists approved reviews with pagination
- "Write a Review" button opens sidebar (conditional based on user status)
- Mark reviews as helpful
- Shows "No reviews yet" state with call-to-action
- Loads reviews on component mount
- Real-time helpful count updates
- Optimized with proper memoization

#### 3. AdminReviews (`AdminReviews.tsx`)

- Admin dashboard component
- Lists all pending reviews
- Approve/Reject actions
- Preview functionality
- Shows user info and product links
- Highlights verified purchases
- Real-time updates after actions

## Usage

### For End Users

1. **Viewing Reviews**:

   - Go to any product page
   - Scroll to the "Customer Reviews" section
   - See average rating, total reviews, and distribution
   - Read individual reviews

2. **Writing a Review**:

   - Must be logged in
   - Click "Write a Review" button
   - Sidebar opens from the right side of the screen
   - Select star rating (1-5) with visual feedback
   - Enter review title (minimum 5 characters)
   - Write detailed review content (minimum 20 characters)
   - View real-time character counts and validation feedback
   - Read review guidelines
   - Click "Submit Review"
   - Sidebar closes and success notification shown
   - Review enters pending status awaiting admin approval

3. **Marking Reviews Helpful**:
   - Click the "Helpful" button on any review
   - Count increases (or decreases if unmarking)
   - Must be logged in

### For Administrators

1. **Access Admin Panel**:

   - Navigate to admin dashboard
   - Find "Reviews" or "Pending Reviews" section

2. **Review Management**:

   - See all pending reviews
   - Click "Preview" to see how review will appear
   - Click "Approve" to publish the review
   - Click "Reject" to decline (with optional notes)

3. **Bulk Operations**:
   - Process multiple reviews in sequence
   - Reviews automatically update product ratings when approved

## Data Flow

### Review Submission Flow:

```
User submits review
↓
Check authentication
↓
Check for duplicate review
↓
Check purchase history (for verified badge)
↓
Create review with "pending" status
↓
Show success message to user
↓
Admin receives notification (pending review)
```

### Review Approval Flow:

```
Admin approves review
↓
Update review status to "approved"
↓
Record approval timestamp and admin
↓
Fetch all approved reviews for product
↓
Calculate new average rating
↓
Calculate rating distribution
↓
Update product document
↓
Review now visible on product page
```

## Performance Optimizations

1. **Component Memoization**:

   - All components use React.memo
   - Callbacks wrapped in useCallback
   - State updates minimized

2. **Data Caching**:

   - Product ratings cached in product document
   - Reduces need for real-time calculations
   - Ratings recalculated only on approval

3. **Efficient Queries**:
   - Only approved reviews fetched for display
   - Pending reviews separate query for admin
   - User details fetched with review in single query

## Security Considerations

1. **Authentication**:

   - All actions require valid authentication
   - User identity verified via Clerk
   - Sanity user lookup for permissions

2. **Authorization**:

   - Only review authors or admins can modify reviews
   - Regular users can't approve/reject reviews
   - Admin actions logged with email

3. **Validation**:

   - Server-side validation for all inputs
   - Character limits enforced
   - Rating bounds checked

4. **Data Integrity**:
   - One review per user per product
   - Helpful marks tracked per user
   - Timestamps for audit trail

## Future Enhancements

Potential improvements to consider:

1. **Reply System**:

   - Allow sellers to respond to reviews
   - Threaded conversations

2. **Image Uploads**:

   - Let users add photos to reviews
   - Image moderation in admin panel

3. **Review Filtering**:

   - Filter by rating
   - Sort by most helpful/recent
   - Search within reviews

4. **Email Notifications**:

   - Notify users when review is approved
   - Alert admins of new pending reviews
   - Remind users to review purchased products

5. **Review Incentives**:

   - Reward points for reviews
   - Gamification badges
   - Featured reviewer status

6. **Analytics**:
   - Review submission trends
   - Average time to approval
   - Most helpful reviewers

## Sanity Studio Configuration

To view and manage reviews in Sanity Studio:

1. Reviews appear as a new document type
2. Custom orderings available:

   - By date (newest/oldest)
   - By rating (highest/lowest)
   - By helpful count

3. Preview shows:
   - Review title
   - Star rating visual
   - Reviewer name
   - Product name
   - Status badge

## Testing Checklist

- [ ] User can submit a review when logged in
- [ ] User cannot submit duplicate reviews
- [ ] Verified purchase badge shows correctly
- [ ] Review appears in pending state
- [ ] Admin can see pending reviews
- [ ] Admin can approve reviews
- [ ] Admin can reject reviews with notes
- [ ] Approved reviews appear on product page
- [ ] Rejected reviews don't appear on product page
- [ ] Rating calculations are accurate
- [ ] Rating distribution is correct
- [ ] Users can mark reviews as helpful
- [ ] Users cannot mark the same review helpful twice
- [ ] Helpful count updates correctly
- [ ] Unauthenticated users see appropriate messages
- [ ] Component performance is optimized

## Troubleshooting

### Reviews not appearing:

1. Check review status (must be "approved")
2. Verify product ID matches
3. Check Sanity query in browser network tab

### Rating not updating:

1. Ensure `getProductReviews` is called after approval
2. Check product document in Sanity Studio
3. Verify patch operation permissions

### Helpful button not working:

1. Confirm user is authenticated
2. Check console for errors
3. Verify user reference in helpfulBy array

## Maintenance

Regular maintenance tasks:

1. **Weekly**:

   - Review pending reviews
   - Check for spam/inappropriate content

2. **Monthly**:

   - Analyze review patterns
   - Update rejection criteria if needed
   - Review admin notes for trends

3. **Quarterly**:
   - Performance audit
   - User feedback on review system
   - Consider new features based on usage
