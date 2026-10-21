# Newsletter Subscription System

A complete newsletter subscription system integrated with Sanity CMS and automated email notifications.

## 🌟 Features

- ✅ **Email Validation** - Client and server-side email format validation
- ✅ **Duplicate Prevention** - Checks if email is already subscribed
- ✅ **Sanity Integration** - Stores all subscriptions in Sanity CMS
- ✅ **Welcome Email** - Sends beautiful HTML email with subscription benefits
- ✅ **User Feedback** - Real-time success/error/info messages
- ✅ **Loading States** - Proper UI feedback during submission
- ✅ **Reactivation** - Allows previously unsubscribed users to re-subscribe
- ✅ **Responsive Design** - Works perfectly on all devices
- ✅ **User Dashboard Integration** - View subscription status and unsubscribe from settings
- ✅ **Auto-detection** - Dashboard automatically detects subscription status

## 📁 Files Created/Modified

### 1. Sanity Schema Type

**File:** `sanity/schemaTypes/subscriptionType.ts`

Defines the subscription document type in Sanity with fields:

- `email` - Subscriber's email address
- `status` - active, unsubscribed, or pending
- `subscribedAt` - Timestamp of subscription
- `unsubscribedAt` - Timestamp if unsubscribed
- `source` - Where subscription came from (footer, popup, checkout, etc.)
- `ipAddress` - IP address for tracking
- `userAgent` - Browser/device information

### 2. Server Actions

**File:** `actions/subscriptionActions.ts`

Server-side functions for subscription management:

- `subscribeToNewsletter()` - Add new subscription
- `unsubscribeFromNewsletter()` - Unsubscribe user
- `checkSubscriptionStatus()` - Check if email is subscribed

### 3. API Route

**File:** `app/api/newsletter/subscribe/route.ts`

REST API endpoint for newsletter subscriptions:

- Validates email format
- Checks for duplicates
- Saves to Sanity
- Sends welcome email
- Returns appropriate responses

### 4. Newsletter Form Component

**File:** `components/NewsletterForm.tsx`

Client-side form component with:

- Email input validation
- Loading states
- Success/error/info message display
- Clean and accessible UI
- Animated feedback messages

### 5. Updated Footer

**File:** `components/Footer.tsx`

Integrated the NewsletterForm component into the footer.

### 6. User Dashboard Component

**File:** `components/profile/NewsletterSubscription.tsx`

Dashboard component for managing newsletter subscription:

- Shows current subscription status
- Displays user email
- Subscribe/Unsubscribe functionality
- Real-time status updates
- Benefits display for non-subscribers

### 7. Updated Settings Page

**File:** `app/(client)/(user)/user/settings/page.tsx`

Added newsletter subscription management to user settings.

### 8. Admin Subscriptions Page

**File:** `app/(admin)/admin/subscriptions/page.tsx`

Admin page for managing all newsletter subscriptions.

### 9. Admin Subscriptions Component

**File:** `components/admin/AdminSubscriptions.tsx`

Full-featured admin component with:

- Subscription list with pagination (10 items per page)
- Search by email
- Filter by status (active, unsubscribed, pending)
- Filter by source (footer, popup, checkout, etc.)
- Statistics cards showing totals
- Delete functionality with confirmation
- Export to CSV
- Responsive table design

### 10. Admin API Routes

**Files:**

- `app/api/admin/subscriptions/route.ts` - GET all subscriptions
- `app/api/admin/subscriptions/[id]/route.ts` - DELETE subscription

Admin-only API endpoints with proper authentication checks.

## 🎯 How It Works

### User Flow:

1. User enters email in footer newsletter form
2. Form validates email format on client side
3. On submit, sends POST request to `/api/newsletter/subscribe`
4. API checks if email already exists in Sanity
5. If new:
   - Creates subscription document in Sanity
   - Sends welcome email with benefits
   - Returns success message
6. If already subscribed:
   - Returns info message about existing subscription
7. If previously unsubscribed:
   - Reactivates subscription
   - Returns welcome back message

### Backend Flow:

```
Client Form → API Route → Server Action → Sanity CMS
                ↓
          Email Service → Welcome Email
```

## 📧 Welcome Email Features

The welcome email includes:

- **Beautiful HTML Design** - Professional gradient-based design
- **Subscription Benefits:**
  - 🎁 Exclusive deals & discounts (up to 50% off)
  - 🚀 Early access to new products
  - 📦 Free shipping offers
  - 💡 Shopping tips & trends
  - 🎂 Birthday surprises

## 🔧 Configuration

### Environment Variables Required:

```env
# Sanity API Token (REQUIRED for write operations)
SANITY_API_TOKEN=your-sanity-api-token-with-write-permissions

# Email Service (from existing setup)
SENDER_EMAIL_ADDRESS=your-email@gmail.com
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REFRESH_TOKEN=your-google-refresh-token

# Optional: Base URL for email links
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

**Important:** The `SANITY_API_TOKEN` must have **write/create** permissions in Sanity to create and update subscription documents.

### Sanity Setup:

1. The subscription schema is already added to `sanity/schemaTypes/index.ts`
2. Deploy Sanity schema:
   ```bash
   npm run sanity:deploy
   # or
   npx sanity deploy
   ```

## 📊 Viewing Subscriptions in Sanity

1. Go to your Sanity Studio (usually `/studio`)
2. Navigate to "Newsletter Subscriptions"
3. View all subscribers with:
   - Email addresses
   - Subscription status
   - Subscription dates
   - Source tracking

## 🎨 Customization

### Modify Email Template:

Edit the `generateWelcomeEmailHTML()` function in:
`app/api/newsletter/subscribe/route.ts`

### Change Benefits:

Update the benefits section in the email template to match your offerings.

### Add More Sources:

Extend the subscription source options in:
`sanity/schemaTypes/subscriptionType.ts`

### Customize Form Styling:

Modify the NewsletterForm component:
`components/NewsletterForm.tsx`

## 🛡️ Error Handling

The system handles various scenarios:

- ✅ Invalid email format
- ✅ Empty email input
- ✅ Already subscribed
- ✅ Previously unsubscribed users
- ✅ Network errors
- ✅ Sanity write failures
- ✅ Email sending failures (doesn't block subscription)

## 📱 Responsive Messages

### Success Message:

> "Thank you for subscribing! Check your email for a welcome message."

### Already Subscribed:

> "You're already subscribed to our newsletter! Check your inbox for our latest updates."

### Welcome Back (Reactivation):

> "Welcome back! You've been successfully resubscribed to our newsletter."

### Error Message:

> "Please enter a valid email address"
> "Something went wrong. Please try again later."

## 🚀 Future Enhancements

Potential features to add:

- [ ] Email preferences/categories
- [ ] Subscription confirmation (double opt-in)
- [ ] Unsubscribe page with reason collection
- [ ] Subscriber analytics dashboard
- [ ] Automated email campaigns
- [ ] A/B testing for email templates
- [ ] RSS to email automation
- [ ] Subscriber segmentation

## 🧪 Testing

### Test Scenarios:

1. ✅ Subscribe with valid email
2. ✅ Try to subscribe again with same email
3. ✅ Submit invalid email format
4. ✅ Submit empty form
5. ✅ Check Sanity for new subscription
6. ✅ Verify welcome email received

### Manual Testing:

```bash
# Test API endpoint directly
curl -X POST http://localhost:3000/api/newsletter/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

## � User Dashboard Integration

Users can manage their newsletter subscription from their dashboard:

1. **Navigate to Settings**: Go to `/user/settings`
2. **View Subscription Status**: See if you're currently subscribed
3. **Subscribe/Unsubscribe**: Toggle subscription with one click
4. **See Benefits**: Non-subscribers see all the benefits they're missing

### Dashboard Features:

- ✅ Real-time subscription status check
- ✅ Visual status indicators (green = subscribed, gray = not subscribed)
- ✅ One-click subscribe/unsubscribe
- ✅ Benefits list for non-subscribers
- ✅ Loading states and error handling

## �📝 Usage Example

The NewsletterForm is already integrated in the Footer component and will appear on all pages where the Footer is rendered.

To use it elsewhere:

```tsx
import NewsletterForm from "@/components/NewsletterForm";

function MyComponent() {
  return (
    <div>
      <h2>Subscribe to our Newsletter</h2>
      <NewsletterForm />
    </div>
  );
}
```

## 🔐 Security Features

- Server-side validation
- Email sanitization (lowercase, trim)
- IP tracking for abuse prevention
- User agent logging
- Rate limiting can be added to API route

## 📞 Support

For issues or questions:

- Check Sanity logs for database errors
- Review email service logs for delivery issues
- Verify environment variables are set correctly

---

**Created:** November 3, 2025  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
