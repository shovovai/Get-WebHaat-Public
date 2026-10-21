# Clerk Payment Flow - Testing Guide

## Overview

The Clerk payment system now has a complete payment interface before marking the order as paid.

## Payment Flow

### 1. User clicks "Pay Now" on Checkout Page

- Payment modal appears with two options:
  - Pay with Stripe (Blue)
  - Pay using Clerk (Purple)

### 2. User selects "Pay using Clerk"

- Order is created in Sanity with `paymentMethod: "clerk"`
- API `/api/checkout/clerk` creates payment session
- User is redirected to `/clerk-payment` page

### 3. Clerk Payment Page (`/clerk-payment`)

**URL Parameters:**

- `session_id`: Clerk payment session ID
- `order_id`: Sanity order ID
- `orderNumber`: Order number
- `amount`: Total payment amount

**Features:**

- Shows order details (order number, customer info, amount)
- Displays purple "Complete Payment" button
- Security notice with lock icon
- Cancel button to return to orders

### 4. User Clicks "Complete Payment"

- Shows "Processing Payment..." with spinner (2 seconds)
- Calls `/api/checkout/clerk/complete` to update order
- Updates order with:
  - `clerkPaymentId`: Session ID
  - `clerkPaymentStatus`: "completed"
  - `paymentStatus`: "paid"
- Shows success message
- Redirects to success page

### 5. Success Page

- Same as Stripe flow
- Shows order confirmation
- Payment method shown as "clerk"

## API Endpoints

### POST /api/checkout/clerk

**Request:**

```json
{
  "orderId": "order_id",
  "orderNumber": "ORDER-xxx",
  "items": [...],
  "email": "user@example.com",
  "shippingAddress": {...},
  "orderAmount": 100.00,
  "clerkUserId": "user_xxx"
}
```

**Response:**

```json
{
  "success": true,
  "paymentId": "clerk_payment_xxx",
  "url": "/clerk-payment?session_id=xxx&order_id=xxx&orderNumber=xxx&amount=100",
  "session": {...}
}
```

### POST /api/checkout/clerk/complete

**Request:**

```json
{
  "orderId": "order_id",
  "sessionId": "clerk_payment_xxx",
  "status": "completed"
}
```

**Response:**

```json
{
  "success": true,
  "order": {...},
  "message": "Payment status updated successfully"
}
```

## Testing Steps

1. **Add items to cart**
2. **Go to checkout**
3. **Select shipping address**
4. **Click "Pay Now"**
5. **Select "Pay using Clerk"** from modal
6. **Verify redirect to `/clerk-payment`**
7. **Check payment details are displayed correctly**
8. **Click "Complete Payment"**
9. **Wait for processing (2 seconds)**
10. **Verify success message**
11. **Verify redirect to success page**
12. **Check order in admin - should show:**
    - Payment Method: clerk
    - Payment Status: paid
    - Clerk Payment ID: clerk_payment_xxx
    - Clerk Payment Status: completed

## Order Schema Updates

**Clerk-specific fields (only when paymentMethod === "clerk"):**

- `clerkPaymentId`: String - Payment session ID
- `clerkPaymentStatus`: String - Payment status (pending, completed, failed)

**Stripe-specific fields (only when paymentMethod === "stripe"):**

- `stripeCheckoutSessionId`: String
- `stripeCustomerId`: String
- `stripePaymentIntentId`: String

## Key Differences from Stripe

| Feature           | Stripe            | Clerk              |
| ----------------- | ----------------- | ------------------ |
| External redirect | Yes (stripe.com)  | No (stays on site) |
| Payment page      | Stripe hosted     | Custom page        |
| Processing time   | Real-time         | Simulated (2s)     |
| Payment gateway   | Stripe            | Internal/Simulated |
| User experience   | External checkout | Seamless on-site   |

## Future Enhancements

1. **Real payment gateway integration**

   - Integrate with actual payment processor
   - Real-time payment validation
   - Webhook handling for payment status

2. **Payment methods**

   - Add credit card form
   - Add wallet balance payment
   - Add multiple payment options

3. **Security**
   - 3D Secure authentication
   - Fraud detection
   - Payment encryption

## Notes

- Currently simulates payment processing (2 second delay)
- Ready for real payment gateway integration
- All order data properly tracked and stored
- Maintains consistency with Stripe flow
