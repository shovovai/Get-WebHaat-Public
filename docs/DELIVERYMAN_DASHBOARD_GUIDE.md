# Deliveryman Dashboard Guide

## Overview

The deliveryman dashboard provides a comprehensive interface for delivery personnel to manage their assigned orders, handle cash-on-delivery payments, and track their delivery performance.

## Access

- **Route**: `/employee/deliveries`
- **Roles**: `deliveryman`, `incharge`
- **Authentication**: Requires active employee status

## Features

### 1. Four-Tab Interface

#### **Assigned Tab**

- Shows orders with status `ready_for_delivery`
- Orders that are assigned but not yet picked up
- Action: "Start Delivery" button to change status to `out_for_delivery`

#### **Delivering Tab**

- Shows orders with status `out_for_delivery`
- Currently being delivered
- Actions:
  - Mark as Delivered (requires cash collection for COD orders)
  - Reschedule Delivery
  - Mark Delivery Failed

#### **Delivered Tab**

- Shows orders with status `delivered`
- Successfully completed deliveries
- Read-only view with delivery notes

#### **Collections Tab**

- Shows orders where `cashCollected = true` AND `paymentReceivedBy = null`
- Cash collected from customers but not yet submitted to accounts
- Displays total cash amount pending submission

### 2. Statistics Dashboard

Four stat cards showing:

1. **Assigned**: Count of orders ready for delivery
2. **Delivering**: Count of orders currently out for delivery
3. **Delivered**: Count of delivered orders
4. **Collections**: Count and total amount of pending cash submissions

### 3. Cash-on-Delivery (COD) Handling

#### COD Order Detection

Orders are considered COD if:

- `paymentMethod === "cash_on_delivery"` OR
- `paymentStatus === "pending"`

#### COD Workflow

1. When delivering a COD order, deliveryman sees a cash collection checkbox
2. **Must check the box** and confirm amount before "Mark as Delivered" is enabled
3. The button is disabled until cash collection is confirmed
4. On delivery:
   - `cashCollected = true`
   - `cashCollectedAmount` = amount entered (defaults to order total)
   - `cashCollectedAt` = current timestamp
   - `paymentStatus` = "paid"
   - `status` = "delivered"

#### Collections Tab

- Shows all orders where cash was collected but not yet submitted to accounts
- Deliveryman holds this cash until accounts receives it
- Once accounts receives payment via `receivePaymentFromDeliveryman()`:
  - `paymentReceivedBy` = accounts employee email
  - `paymentReceivedAt` = timestamp
  - Order moves out of Collections tab

### 4. Order Actions

#### Start Delivery (Assigned → Delivering)

```typescript
startDelivery(orderId, notes?)
```

- Changes status to `out_for_delivery`
- Increments `deliveryAttempts`
- Optional delivery notes

#### Mark as Delivered (Delivering → Delivered)

```typescript
markAsDelivered(orderId, cashCollected?, cashAmount?, notes?)
```

- **Requires cash collection for COD orders**
- Changes status to `delivered`
- Records delivery timestamp
- Updates employee performance metrics
- If cash collected, updates payment status to "paid"

#### Reschedule Delivery

```typescript
rescheduleDelivery(orderId, newDate, reason);
```

- Changes status to `rescheduled`
- Records new delivery date
- Requires reason for rescheduling

#### Mark Delivery Failed

```typescript
markDeliveryFailed(orderId, reason);
```

- Changes status to `failed_delivery`
- Increments `deliveryAttempts`
- Records failure reason
- Requires explanation

### 5. Order Details Sheet

Comprehensive view showing:

#### Customer Information

- Name
- Email address
- Contact details

#### Delivery Address

- Complete shipping address
- Formatted for easy reading
- Map integration ready

#### Products List

- Product images
- Names and quantities
- Individual prices

#### Payment Information

- Total amount
- Payment method badge
- Payment status
- **COD Indicator** if cash needs to be collected
- Cash collection status (if collected)
- Submission status (if submitted to accounts)

#### Delivery Timeline

- Dispatched timestamp
- Delivery attempts count
- Rescheduled date (if applicable)
- Delivered timestamp (when completed)

#### Action Buttons (Context-Aware)

Based on order status:

- **Ready for Delivery**: "Start Delivery" button
- **Out for Delivery**:
  - Cash collection checkbox (for COD)
  - "Mark as Delivered" button (enabled only after cash collection for COD)
  - Reschedule section with date picker and reason
  - Mark failed section with reason field
- **Delivered**: Read-only view with delivery notes

### 6. Search and Filtering

- Search by:
  - Order number
  - Customer name
  - Email address
- Pagination options: 10, 20, 30, 50, All
- Real-time filtering across tabs

### 7. Responsive Design

#### Desktop View

- Full table layout
- All columns visible
- Hover effects

#### Mobile View

- Card-based layout
- Essential information stacked
- Touch-optimized buttons

## Payment Flow Example

### COD Order Delivery Process:

1. **Assigned Tab**: Order appears as ready for delivery

   - Payment badge shows "COD - Pending" in red

2. **Start Delivery**: Deliveryman clicks "Start Delivery"

   - Order moves to "Delivering" tab
   - Status changes to `out_for_delivery`

3. **At Customer Location**: Open order details

   - See orange "Cash Collection Required" section
   - Check "I have collected cash from customer"
   - Confirm amount (defaults to order total, editable)
   - "Mark as Delivered" button becomes enabled

4. **Complete Delivery**: Click "Mark as Delivered"

   - `cashCollected = true`
   - `cashCollectedAmount` = confirmed amount
   - `paymentStatus = "paid"`
   - Order moves to both "Delivered" and "Collections" tabs

5. **Collections Tab**: Order shows pending submission

   - Displays amount collected
   - Shows "Pending submission to Accounts" badge
   - Deliveryman sees total cash to submit

6. **Submit to Accounts**: Accounts employee uses their interface
   - Calls `receivePaymentFromDeliveryman()`
   - Order shows "Submitted to Accounts" badge
   - Removes from Collections tab

### Pre-Paid Order Delivery Process:

1. **Assigned Tab**: Order appears

   - Payment badge shows "Paid" in green

2. **Start & Deliver**: Same process as COD
   - No cash collection checkbox
   - "Mark as Delivered" is immediately enabled
   - No Collections tab entry

## Performance Metrics

Each delivery action updates employee performance:

- `ordersProcessed`: Incremented on each action
- `ordersDelivered`: Incremented on successful delivery
- `cashCollected`: Sum of cash amounts collected

## Error Handling

- Cannot start delivery if not assigned to deliveryman
- Cannot deliver COD order without cash collection
- Cannot reschedule without date and reason
- Cannot mark failed without reason
- Toast notifications for all actions

## Components Structure

```
/app/(employee)/employee/deliveries/page.tsx
  └─ DeliveryOrdersList (Client Component)
      ├─ Stats Cards
      ├─ Search & Filters
      ├─ Tabs (Assigned, Delivering, Delivered, Collections)
      │   ├─ Desktop Table View
      │   └─ Mobile Card View
      └─ DeliveryOrderSheet (Sidebar)
          ├─ Customer Info
          ├─ Delivery Address
          ├─ Products List
          ├─ Payment Info (with COD status)
          ├─ Delivery Timeline
          └─ Action Buttons (context-aware)
```

## Server Actions Used

From `/actions/orderEmployeeActions.ts`:

- `getOrdersForEmployee()` - Fetches orders for deliveryman
- `startDelivery(orderId, notes?)` - Start delivery
- `markAsDelivered(orderId, cashCollected?, cashAmount?, notes?)` - Complete delivery
- `rescheduleDelivery(orderId, newDate, reason)` - Reschedule
- `markDeliveryFailed(orderId, reason)` - Mark failed

## Integration Points

### With Warehouse

- Receives orders when warehouse assigns via `assignDeliveryman()`
- Order status changes from `packed` → `ready_for_delivery`

### With Accounts

- Cash collections tracked until accounts receives
- Accounts uses `receivePaymentFromDeliveryman()` to complete flow

### With Customer

- COD payment collection at delivery
- Delivery confirmation updates order status

## Future Enhancements

Potential additions:

- GPS tracking integration
- Route optimization
- Delivery proof (signature/photo)
- Customer rating system
- Real-time notifications
- Daily cash summary report
- Navigation integration
