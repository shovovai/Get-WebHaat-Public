# Employee Management System - Quick Start Guide

## For Administrators

### Adding a New Employee

1. Navigate to `/admin/employees`
2. Click "Add Employee" button
3. Select user from dropdown (users must be registered in the system first)
4. Choose employee role:
   - **Call Center** - For order confirmation
   - **Packer** - For packaging orders
   - **Delivery Man** - For deliveries and cash collection
   - **In-Charge** - Full system access and monitoring
   - **Accounts** - Payment receipt and analytics
5. Click "Assign Role"

### Managing Employees

**Suspend an Employee:**

1. Find employee in the list
2. Click "Suspend" button
3. Enter suspension reason
4. Click "Suspend Employee"

**Activate a Suspended Employee:**

1. Find suspended employee (use Status filter)
2. Click "Activate" button

**Remove Employee Role:**

1. Find employee in the list
2. Click "Remove" button
3. Confirm action

## For Call Center Employees

### Order Confirmation Workflow

1. Go to `/admin/orders`
2. You'll see pending orders that need confirmation
3. For each order:

   **Step 1: Confirm Address**

   - Review customer shipping address
   - Click "Confirm Address"
   - Add notes if needed (optional)
   - Click "Confirm"

   **Step 2: Confirm Order**

   - Verify order details and products
   - Click "Confirm Order"
   - Add notes if needed (optional)
   - Click "Confirm"

4. Order moves to packing queue

### Dashboard Metrics

- **Total Orders** - All orders in your queue
- **Pending Action** - Orders waiting for your confirmation
- **Completed** - Orders you've confirmed
- **Your Performance** - Total orders processed

## For Packer Employees

### Packing Workflow

1. Go to `/admin/orders`
2. You'll see confirmed orders ready for packing
3. For each order:

   **Step 1: Pack the Order**

   - Gather all products from the order
   - Pack them securely
   - Click "Mark as Packed"
   - Add packing notes if needed
   - Click "Confirm"

   **Step 2: Assign Deliveryman**

   - Click "Assign Deliveryman"
   - Select available deliveryman from dropdown
   - Click "Confirm"

4. Order moves to delivery queue

### Dashboard Metrics

- **Total Orders** - All orders in your queue
- **Pending Action** - Orders waiting to be packed
- **Completed** - Orders delivered
- **Your Performance** - Total orders packed

## For Delivery Men

### Delivery Workflow

1. Go to `/admin/orders`
2. You'll see orders assigned to you
3. Review delivery address and customer details
4. Complete delivery:

   **For Cash on Delivery (COD) or Pending Payment:**

   - Click "Mark as Delivered"
   - **Important:** Enter cash collected amount
   - Add delivery notes (optional)
   - Click "Confirm"
   - **Cash collection is mandatory** - cannot mark delivered without collecting payment

   **For Pre-Paid Orders:**

   - Click "Mark as Delivered"
   - Add delivery notes (optional)
   - Click "Confirm"

5. Hand over collected cash to Accounts department

### Dashboard Metrics

- **Total Orders** - All your assigned deliveries
- **Pending Action** - Orders waiting for delivery
- **Completed** - Successfully delivered orders
- **Your Performance** - Total deliveries and cash collected

## For In-Charge

### Full System Access

As In-Charge, you have access to all features:

1. **Order Management** (`/admin/orders`)

   - View all orders in the system
   - Perform any role's actions
   - Monitor entire workflow

2. **Employee Management** (`/admin/employees`)

   - Manage all employees
   - Assign/remove roles
   - Suspend/activate employees
   - Monitor performance

3. **Analytics Dashboard** (`/admin/analytics`)
   - Revenue tracking
   - Employee performance
   - Cash flow monitoring
   - Order statistics

### Key Responsibilities

- Monitor order flow
- Handle escalations
- Track employee performance
- Ensure smooth operations

## For Accounts Employees

### Payment Receipt Workflow

1. Go to `/admin/orders`
2. Filter orders with "Cash Collected" status
3. Collect cash from deliverymen
4. For each payment:
   - Click "Receive Payment"
   - Add notes (deliveryman name, batch number, etc.)
   - Click "Confirm"

### Analytics Access (`/admin/analytics`)

Monitor financial metrics:

- **Total Revenue** - All paid orders
- **Cash Collected** - COD payments collected
- **Pending Collection** - Cash not yet received from deliverymen
- Employee performance and cash handling

### Dashboard Metrics

- **Total Orders** - All orders in system
- **Pending Action** - Payments waiting to be received
- **Your Performance** - Total payments processed

## Common Actions

### Order Progress Tracking

Every order shows a progress bar with steps:

1. ☐ Address Confirmed (Call Center)
2. ☐ Order Confirmed (Call Center)
3. ☐ Packed (Packer)
4. ☐ Assigned for Delivery (Packer)
5. ☐ Delivered (Deliveryman)
6. ☐ Payment Received (Accounts)

### Order Status Badges

- **Pending** (Yellow) - New order
- **Processing** (Blue) - Being prepared
- **Shipped** (Blue) - Packed and ready
- **Out for Delivery** (Blue) - With deliveryman
- **Delivered** (Green) - Completed
- **Cancelled** (Red) - Cancelled

### Payment Status Badges

- **Pending** (Red) - Payment not received
- **Paid** (Green) - Payment complete

## Important Notes

### Cash Collection Rules

⚠️ **Deliverymen MUST collect cash before marking order as delivered for:**

- Cash on Delivery (COD) orders
- Orders with pending payment status

The system will prevent marking as delivered without cash collection.

### Performance Tracking

All actions are automatically tracked:

- Orders processed
- Orders confirmed (Call Center)
- Orders packed (Packer)
- Orders delivered (Deliveryman)
- Cash collected (Deliveryman)
- Payments received (Accounts)

### Audit Trail

Every status change is logged with:

- Employee who made the change
- Their role
- Timestamp
- Optional notes

## Troubleshooting

### Can't See Orders

- Check your employee status (must be "Active")
- Ensure you're viewing the correct tab
- Orders appear based on your role and workflow stage

### Can't Perform Action

- Verify previous steps are completed
- Check if order is assigned to you (for deliverymen)
- Ensure you have the correct role

### Missing from Employee List

- Contact administrator to assign employee role
- Check if your account is registered in the system

## Mobile Usage

The entire system is mobile-responsive:

- Use on phones and tablets
- Touch-friendly buttons
- Scrollable tables
- Optimized layouts

## Support

For issues or questions:

1. Contact your In-Charge
2. Report technical issues to administrator
3. Check the documentation: `/docs/EMPLOYEE_MANAGEMENT_SYSTEM.md`

---

**Last Updated:** November 1, 2025
**System Version:** 1.0.0
