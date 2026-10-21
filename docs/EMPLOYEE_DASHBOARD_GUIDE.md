# Employee Dashboard - Quick Start Guide

## Overview

The employee dashboard is a comprehensive system for managing orders with role-based access control. Call center employees can view, confirm addresses, and process customer orders with a clean, intuitive interface.

## Access the Dashboard

1. **For Employees**: After an admin assigns you an employee role, you'll see an "Employee Dashboard" link in the user dropdown menu (top-right corner)
2. **Direct URL**: Navigate to `/employee` and you'll be automatically redirected to your role-specific dashboard

## Employee Roles

### Call Center (`callcenter`)

- **Access**: `/employee/orders`
- **Permissions**:
  - View all pending and unconfirmed orders
  - Confirm customer addresses
  - Confirm orders for processing
- **Features**:
  - Search orders by order number, customer name, or email
  - Filter orders by status
  - View detailed order information
  - Add notes when confirming

### Packer (`packer`)

- **Access**: `/employee/packing`
- **Permissions**: Pack confirmed orders
- **Status**: Coming soon

### Delivery Man (`deliveryman`)

- **Access**: `/employee/deliveries`
- **Permissions**: Deliver orders and collect cash
- **Status**: Coming soon

### Accounts (`accounts`)

- **Access**: `/employee/payments`
- **Permissions**: Receive and manage cash collections
- **Status**: Coming soon

### In-Charge (`incharge`)

- **Access**: `/employee/dashboard`
- **Permissions**: Full access to all modules and analytics
- **Status**: Coming soon

## Call Center Dashboard Features

### Orders List

- **Search**: Find orders by order number, customer name, or email
- **Filters**: Filter by order status (pending, processing, shipped, etc.)
- **Refresh**: Real-time updates with animated refresh button
- **Priority Badges**: Visual indicators for orders needing action
  - 🔴 Red "Address Pending" - Address not yet confirmed
  - 🔵 Blue "Needs Confirmation" - Address confirmed but order not confirmed

### Order Details View

- **Customer Information**: Name, email, order date
- **Delivery Address**: Full address with confirmation status
- **Products**: List of ordered items with images and quantities
- **Payment Info**: Payment method, status, and total amount
- **Actions**:
  - **Confirm Address**: Verify and confirm delivery address
  - **Confirm Order**: Process the order for packing
  - **Notes**: Add optional notes for tracking

### Order Confirmation Workflow

1. **View Orders**

   - Orders appear in the list with priority badges
   - Click "View" to open order details

2. **Confirm Address**

   - Review customer's delivery address
   - Verify contact information
   - Click "Confirm Address" button
   - Optionally add notes (e.g., "Customer called to verify")

3. **Confirm Order**
   - Only available after address is confirmed
   - Reviews order items and payment status
   - Click "Confirm Order" button
   - Order moves to "Processing" status
   - Gets queued for packing team

### Status Indicators

**Order Status Badges**:

- 🟡 **Pending**: New order, not processed
- 🔵 **Processing**: Order confirmed, awaiting packing
- 🟣 **Shipped**: Packed and ready/dispatched
- 🟠 **Out for Delivery**: With delivery person
- 🟢 **Delivered**: Successfully delivered
- 🔴 **Cancelled**: Order cancelled

**Payment Status**:

- 🟢 **Paid**: Payment received
- 🟡 **Pending**: Awaiting payment (COD)

**Confirmation Status**:

- ✅ Address Confirmed
- ✅ Order Confirmed
- ❌ Not Confirmed

## Navigation

### Top Navigation Bar

- **Logo**: Return to employee home
- **Role Badge**: Shows your current role
- **Navigation Links**: Quick access to relevant sections
- **User Menu**: Profile, back to store, sign out

### Mobile Responsive

- Hamburger menu on mobile devices
- Touch-friendly interface
- Optimized for tablet use

## Search & Filters

### Search Bar

- Real-time search
- Searches across:
  - Order numbers
  - Customer names
  - Email addresses

### Status Filter Dropdown

- All Orders
- Pending
- Processing
- Shipped
- Out for Delivery
- Delivered
- Cancelled

## Performance Tracking

The system automatically tracks your performance:

- **Orders Processed**: Total orders you've handled
- **Orders Confirmed**: Orders you've confirmed
- **Response Time**: Average time to process orders
- **Activity**: Last active timestamp

## Best Practices

### For Call Center Agents

1. **Address Verification**

   - Always verify address completeness
   - Check for phone number availability
   - Confirm city, state, and ZIP code accuracy
   - Add notes if customer provides special instructions

2. **Order Confirmation**

   - Review all items before confirming
   - Check payment method
   - Verify order total
   - Add notes for special handling requirements

3. **Communication**

   - Use the notes field for important information
   - Document customer requests
   - Flag any unusual orders
   - Coordinate with team members

4. **Efficiency Tips**
   - Use search to find specific orders quickly
   - Filter by status to focus on pending tasks
   - Refresh regularly to see new orders
   - Process urgent orders first (marked with priority badges)

## Technical Details

### Architecture

- **Framework**: Next.js 16 with App Router
- **Authentication**: Clerk
- **Database**: Sanity CMS
- **UI**: Shadcn/UI components
- **Server Actions**: Role-based order processing

### Security

- Role-based access control (RBAC)
- Server-side authentication
- Permission checks on all actions
- Activity logging and audit trail

### Data Flow

1. User places order → Order created in Sanity
2. Call center sees order in dashboard
3. Agent confirms address → `addressConfirmedBy` field updated
4. Agent confirms order → `orderConfirmedBy` field updated, status changes to "Processing"
5. Order moves to packer queue
6. Complete workflow tracked with timestamps and employee info

## Troubleshooting

### "Unauthorized" Error

- Ensure you're logged in
- Verify your employee role is active
- Contact admin if role assignment is needed

### Orders Not Showing

- Check your filter settings (try "All Orders")
- Click the refresh button
- Ensure you have the correct permissions

### Cannot Confirm Address/Order

- Verify you have call center or in-charge role
- Check if previous steps are completed
- Ensure order is not already confirmed

### Performance Issues

- Clear browser cache
- Close unused browser tabs
- Check internet connection
- Try refreshing the page

## Support

For technical support or questions:

- Contact IT Support
- Check internal documentation
- Report bugs to development team

## Updates & Changes

**Version 1.0** (Current)

- ✅ Call center orders dashboard
- ✅ Address confirmation
- ✅ Order confirmation
- ✅ Search and filters
- ✅ Real-time updates
- ✅ Mobile responsive
- ⏳ Packing module (coming soon)
- ⏳ Delivery module (coming soon)
- ⏳ Payments module (coming soon)
- ⏳ Analytics dashboard (coming soon)

---

**Last Updated**: November 2025
**System Status**: ✅ Active
**Support**: Available 24/7
