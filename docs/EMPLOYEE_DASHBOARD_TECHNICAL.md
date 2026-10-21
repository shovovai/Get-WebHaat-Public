# Employee Dashboard - Technical Documentation

## System Architecture

### Overview

The employee dashboard is a role-based order management system built on Next.js 16 with server-side rendering, Clerk authentication, and Sanity CMS for data storage.

## File Structure

```
app/
├── (employee)/
│   ├── layout.tsx                    # Employee layout with auth check
│   └── employee/
│       ├── page.tsx                  # Root redirect based on role
│       ├── orders/page.tsx           # Call center orders page
│       ├── packing/page.tsx          # Packer dashboard (placeholder)
│       ├── deliveries/page.tsx       # Delivery dashboard (placeholder)
│       ├── payments/page.tsx         # Accounts dashboard (placeholder)
│       └── dashboard/page.tsx        # In-charge analytics (placeholder)
│
├── api/
│   └── user/
│       └── employee-status/route.ts  # API to check employee status

components/
├── employee/
│   ├── EmployeeNav.tsx               # Navigation bar
│   ├── OrdersList.tsx                # Orders list with filters
│   └── OrderDetailSheet.tsx          # Order detail sidebar

actions/
├── employeeActions.ts                # Employee CRUD operations
└── orderEmployeeActions.ts           # Order processing actions
    ├── confirmAddress()
    ├── confirmOrder()
    ├── markAsPacked()
    ├── assignDeliveryman()
    ├── markAsDelivered()
    ├── receivePaymentFromDeliveryman()
    └── getOrdersForEmployee()

types/
└── employee.ts                       # TypeScript type definitions
    ├── EmployeeRole
    ├── EmployeeStatus
    ├── Employee
    ├── EmployeePermissions
    ├── OrderEmployeeTracking
    └── ROLE_PERMISSIONS
```

## Route Structure

### Employee Routes (Protected)

All routes under `(employee)` are protected by the layout authentication:

```typescript
// app/(employee)/layout.tsx
- Checks for authenticated user (Clerk)
- Validates employee status (active)
- Redirects to sign-in if not authenticated
- Redirects to home if not an employee
```

### Route Group: `(employee)`

**Purpose**: Isolates employee-only pages with shared layout

**Layout Features**:

- Employee navigation bar
- Role-based menu items
- Automatic auth check
- Consistent styling

### Individual Routes

#### `/employee` (Root)

- **Component**: `app/(employee)/employee/page.tsx`
- **Behavior**: Redirects to role-specific dashboard
- **Redirects**:
  - `callcenter` → `/employee/orders`
  - `packer` → `/employee/packing`
  - `deliveryman` → `/employee/deliveries`
  - `accounts` → `/employee/payments`
  - `incharge` → `/employee/dashboard`

#### `/employee/orders` (Call Center)

- **Component**: `app/(employee)/employee/orders/page.tsx`
- **Access**: `callcenter`, `incharge`
- **Features**: Order list, search, filters, confirmation actions

#### Other Routes

- `/employee/packing` - Packer dashboard
- `/employee/deliveries` - Delivery management
- `/employee/payments` - Payment processing
- `/employee/dashboard` - Analytics (in-charge only)

## Components

### EmployeeNav Component

**File**: `components/employee/EmployeeNav.tsx`

**Props**:

```typescript
interface EmployeeNavProps {
  employee: Employee;
}
```

**Features**:

- Role-based navigation links
- User profile menu (Sheet component)
- Mobile responsive
- Active link highlighting

**Navigation Items**:

```typescript
const navItems = [
  {
    href: "/employee/orders",
    label: "Orders",
    icon: ShoppingCart,
    roles: ["callcenter", "incharge"],
  },
  {
    href: "/employee/packing",
    label: "Packing",
    icon: Package,
    roles: ["packer", "incharge"],
  },
  {
    href: "/employee/deliveries",
    label: "Deliveries",
    icon: Truck,
    roles: ["deliveryman", "incharge"],
  },
  {
    href: "/employee/payments",
    label: "Payments",
    icon: DollarSign,
    roles: ["accounts", "incharge"],
  },
  {
    href: "/employee/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["incharge"],
  },
];
```

### OrdersList Component

**File**: `components/employee/OrdersList.tsx`

**Props**:

```typescript
interface OrdersListProps {
  employee: Employee;
}
```

**State Management**:

```typescript
const [orders, setOrders] = useState<Order[]>([]);
const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
const [loading, setLoading] = useState(true);
const [searchQuery, setSearchQuery] = useState("");
const [statusFilter, setStatusFilter] = useState("all");
const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
const [isRefreshing, setIsRefreshing] = useState(false);
```

**Key Functions**:

- `loadOrders()` - Fetches orders via server action
- `handleRefresh()` - Reloads orders with animation
- `getStatusColor()` - Returns badge color for order status
- `getPriorityBadge()` - Shows action-required badges

**Features**:

- Real-time search (order number, customer name, email)
- Status filtering
- Refresh with animation
- Priority indicators
- Order detail sheet integration

### OrderDetailSheet Component

**File**: `components/employee/OrderDetailSheet.tsx`

**Props**:

```typescript
interface OrderDetailSheetProps {
  order: Order;
  employee: Employee;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}
```

**State**:

```typescript
const [notes, setNotes] = useState("");
const [confirmingAddress, setConfirmingAddress] = useState(false);
const [confirmingOrder, setConfirmingOrder] = useState(false);
```

**Actions**:

- `handleConfirmAddress()` - Calls `confirmAddress` server action
- `handleConfirmOrder()` - Calls `confirmOrder` server action

**Conditional Actions**:

```typescript
const canConfirmAddress =
  employee.role === "callcenter" && !order.addressConfirmedBy;
const canConfirmOrder =
  (employee.role === "callcenter" || employee.role === "incharge") &&
  order.addressConfirmedBy &&
  !order.orderConfirmedBy;
```

**UI Sections**:

1. Order status badges
2. Customer information
3. Delivery address with confirmation status
4. Product list with images
5. Payment information
6. Action buttons (if permitted)
7. Notes textarea

## Server Actions

### Employee Actions (`actions/employeeActions.ts`)

#### `getCurrentEmployee()`

```typescript
export async function getCurrentEmployee(): Promise<Employee | null>;
```

- Gets current logged-in employee
- Returns employee with role and permissions
- Used in layout for auth check

#### `assignEmployeeRole()`

```typescript
export async function assignEmployeeRole(
  userId: string,
  role: EmployeeRole
): Promise<{ success: boolean; message: string; employee?: Employee }>;
```

- Admin function to assign employee roles
- Updates user document in Sanity
- Sets role, status, assigned timestamp

#### Other Functions

- `removeEmployeeRole(userId)`
- `updateEmployeeStatus(userId, status, reason?)`
- `getAllEmployees()`
- `getEmployeesByRole(role)`
- `updateEmployeePerformance(userId, performanceData)`

### Order Employee Actions (`actions/orderEmployeeActions.ts`)

#### `confirmAddress()`

```typescript
export async function confirmAddress(
  orderId: string,
  notes?: string
): Promise<{ success: boolean; message: string }>;
```

**Flow**:

1. Verify user is authenticated
2. Check user has `callcenter` role
3. Update order with `addressConfirmedBy` and `addressConfirmedAt`
4. Add status history entry
5. Return success/error response

**Sanity Update**:

```typescript
await backendClient
  .patch(orderId)
  .set({
    addressConfirmedBy: employee.email,
    addressConfirmedAt: new Date().toISOString(),
  })
  .commit();
```

#### `confirmOrder()`

```typescript
export async function confirmOrder(
  orderId: string,
  notes?: string
): Promise<{ success: boolean; message: string }>;
```

**Flow**:

1. Verify authentication
2. Check `callcenter` or `incharge` role
3. Verify address was confirmed first
4. Update order with `orderConfirmedBy`, `orderConfirmedAt`
5. Change status to "processing"
6. Update employee performance metrics
7. Add status history

**Prerequisites**:

```typescript
if (!order.addressConfirmedBy) {
  return { success: false, message: "Please confirm the address first" };
}
```

**Performance Tracking**:

```typescript
await updateEmployeePerformance(employee._id, {
  ordersProcessed: (currentPerformance.ordersProcessed || 0) + 1,
  ordersConfirmed: (currentPerformance.ordersConfirmed || 0) + 1,
});
```

#### `getOrdersForEmployee()`

```typescript
export async function getOrdersForEmployee(): Promise<Order[]>;
```

**Role-based Filtering**:

```typescript
switch (employee.employeeRole) {
  case "callcenter":
    filter = `*[_type == "order" && (status == "pending" || !defined(orderConfirmedBy))]`;
    break;
  case "packer":
    filter = `*[_type == "order" && defined(orderConfirmedBy) && !defined(packedBy)]`;
    break;
  case "deliveryman":
    filter = `*[_type == "order" && assignedDeliverymanId == $employeeId]`;
    break;
  // ... other roles
}
```

**Returns**: Full order objects with tracking fields

## Type System

### Employee Types (`types/employee.ts`)

#### EmployeeRole

```typescript
export type EmployeeRole =
  | "callcenter"
  | "packer"
  | "deliveryman"
  | "incharge"
  | "accounts";
```

#### Employee Interface

```typescript
export interface Employee {
  _id: string;
  userId: string;
  clerkUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: EmployeeRole;
  status: EmployeeStatus;
  assignedBy: string;
  assignedAt: string;
  permissions: EmployeePermissions;
  performance?: EmployeePerformance;
  createdAt: string;
  updatedAt: string;
}
```

#### EmployeePermissions

```typescript
export interface EmployeePermissions {
  canViewOrders: boolean;
  canConfirmOrders: boolean;
  canPackOrders: boolean;
  canDeliverOrders: boolean;
  canCollectCash: boolean;
  canReceivePayments: boolean;
  canViewAnalytics: boolean;
  canManageEmployees: boolean;
  canAccessAdmin: boolean;
}
```

#### ROLE_PERMISSIONS

```typescript
export const ROLE_PERMISSIONS: Record<EmployeeRole, EmployeePermissions> = {
  callcenter: {
    canViewOrders: true,
    canConfirmOrders: true,
    canPackOrders: false,
    // ... other permissions
  },
  // ... other roles
};
```

#### OrderEmployeeTracking

```typescript
export interface OrderEmployeeTracking {
  addressConfirmedBy?: string;
  addressConfirmedAt?: string;
  orderConfirmedBy?: string;
  orderConfirmedAt?: string;
  packedBy?: string;
  packedAt?: string;
  dispatchedBy?: string;
  dispatchedAt?: string;
  assignedDeliverymanId?: string;
  assignedDeliverymanName?: string;
  deliveredBy?: string;
  deliveredAt?: string;
  cashCollected?: boolean;
  cashCollectedAmount?: number;
  cashCollectedAt?: string;
  paymentReceivedBy?: string;
  paymentReceivedAt?: string;
  statusHistory?: OrderStatusHistoryItem[];
}
```

## Database Schema

### User Document (Sanity)

Employee fields added to user type:

```javascript
{
  _type: 'user',
  isEmployee: boolean,
  employeeRole: 'callcenter' | 'packer' | 'deliveryman' | 'incharge' | 'accounts',
  employeeStatus: 'active' | 'inactive' | 'suspended',
  employeeAssignedBy: string,
  employeeAssignedAt: datetime,
  employeeSuspendedBy: string,
  employeeSuspendedAt: datetime,
  employeeSuspensionReason: string,
  employeePerformance: {
    ordersProcessed: number,
    ordersConfirmed: number,
    ordersPacked: number,
    ordersDelivered: number,
    cashCollected: number,
    paymentsReceived: number,
    lastActiveAt: datetime
  }
}
```

### Order Document (Sanity)

Employee tracking fields:

```javascript
{
  _type: 'order',
  // ... existing fields
  addressConfirmedBy: string,
  addressConfirmedAt: datetime,
  orderConfirmedBy: string,
  orderConfirmedAt: datetime,
  packedBy: string,
  packedAt: datetime,
  assignedDeliverymanId: reference,
  assignedDeliverymanName: string,
  dispatchedAt: datetime,
  deliveredBy: string,
  deliveredAt: datetime,
  cashCollected: boolean,
  cashCollectedAmount: number,
  cashCollectedAt: datetime,
  paymentReceivedBy: string,
  paymentReceivedAt: datetime,
  statusHistory: array[{
    status: string,
    changedBy: string,
    changedByRole: string,
    changedAt: datetime,
    notes: string
  }]
}
```

## API Endpoints

### `/api/user/employee-status`

**Method**: GET

**Purpose**: Check if current user is an active employee

**Response**:

```typescript
{
  isEmployee: boolean;
  role: EmployeeRole | null;
}
```

**Usage**: Called by UserDropdown to show/hide employee dashboard link

## Security & Authorization

### Route Protection

```typescript
// app/(employee)/layout.tsx
export default async function EmployeeLayout({ children }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const employee = await getCurrentEmployee();
  if (!employee || employee.status !== "active") {
    redirect("/");
  }

  return <>{children}</>;
}
```

### Page-Level Authorization

```typescript
// app/(employee)/employee/orders/page.tsx
export default async function OrdersPage() {
  const employee = await getCurrentEmployee();
  if (!employee) redirect("/");

  // Role check
  if (!["callcenter", "incharge"].includes(employee.role)) {
    redirect("/employee");
  }

  return <OrdersList employee={employee} />;
}
```

### Server Action Authorization

```typescript
export async function confirmAddress(orderId: string) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return { success: false, message: "Unauthorized" };
  }

  const employee = await backendClient.fetch(
    `*[_type == "user" && clerkUserId == $clerkUserId && isEmployee == true && employeeRole == "callcenter"][0]`,
    { clerkUserId }
  );

  if (!employee) {
    return {
      success: false,
      message: "Only call center employees can confirm addresses",
    };
  }

  // ... proceed with action
}
```

## Performance Optimizations

### Data Fetching

- Server-side data fetching in page components
- Client-side refresh with loading states
- Efficient Sanity queries with field projection

### Component Optimization

- Client components only where needed
- Server components for static content
- Lazy loading for modals/sheets

### Caching Strategy

- Next.js automatic caching for static routes
- No caching for employee dashboard (real-time data)
- Manual refresh with user control

## Error Handling

### Server Actions

```typescript
try {
  // ... action logic
  return { success: true, message: "Operation completed" };
} catch (error) {
  console.error("Error:", error);
  return {
    success: false,
    message: error instanceof Error ? error.message : "Operation failed",
  };
}
```

### Client Components

```typescript
const handleAction = async () => {
  try {
    setLoading(true);
    const result = await serverAction();

    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  } catch (error) {
    toast.error("An unexpected error occurred");
  } finally {
    setLoading(false);
  }
};
```

## Testing Checklist

### Authentication & Authorization

- [ ] Unauthenticated users redirected to sign-in
- [ ] Non-employees redirected to home
- [ ] Inactive employees denied access
- [ ] Call center can access orders page
- [ ] Other roles redirected from orders page
- [ ] In-charge can access all pages

### Order Management

- [ ] Orders list loads correctly
- [ ] Search filters orders properly
- [ ] Status filter works
- [ ] Refresh button updates data
- [ ] Order detail sheet opens
- [ ] Address confirmation works
- [ ] Order confirmation works (after address)
- [ ] Cannot confirm order without address
- [ ] Notes field saves correctly
- [ ] Success/error toasts display

### UI/UX

- [ ] Mobile responsive
- [ ] Loading states show
- [ ] Error states handled
- [ ] Navigation highlights active page
- [ ] Priority badges display correctly
- [ ] Images load properly

### Performance Tracking

- [ ] Orders processed count updates
- [ ] Orders confirmed count updates
- [ ] Timestamps recorded correctly
- [ ] Employee email tracked

## Future Enhancements

### Planned Features

1. **Packer Module**

   - View confirmed orders
   - Mark as packed
   - Generate packing slips
   - Assign to deliveryman

2. **Delivery Module**

   - My deliveries view
   - Route optimization
   - Cash collection tracking
   - GPS integration

3. **Accounts Module**

   - Cash receipt management
   - Daily reconciliation
   - Payment reports
   - Financial analytics

4. **Analytics Dashboard**

   - Real-time metrics
   - Employee performance
   - Order trends
   - Revenue tracking

5. **Notifications**

   - Real-time alerts
   - New order notifications
   - Assignment notifications
   - Performance updates

6. **Mobile App**
   - Native mobile apps
   - Offline support
   - Push notifications
   - Camera integration for delivery proof

## Deployment Notes

### Environment Variables

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Sanity
NEXT_PUBLIC_SANITY_PROJECT_ID=
NEXT_PUBLIC_SANITY_DATASET=
SANITY_API_TOKEN=
```

### Build Command

```bash
pnpm build
```

### Production Considerations

- Enable Sanity CDN for production
- Configure proper CORS settings
- Set up monitoring (Sentry, LogRocket)
- Enable rate limiting on server actions
- Set up backup strategy for Sanity

---

**Version**: 1.0.0  
**Last Updated**: November 2025  
**Maintainer**: Development Team
