# Employee Orders - Pagination & Responsive Design

## Overview

Enhanced the employee orders dashboard with pagination, responsive design for mobile devices, and improved loading states.

## Changes Made

### 1. Pagination System

#### Features:

- **Default Page Size**: 20 orders per page
- **Per Page Options**: 10, 20, 30, 50, All
- **Smart Pagination**:
  - Shows up to 5 page numbers at a time
  - Highlights current page
  - Previous/Next buttons with disabled states
  - Shows total count and current range

#### Implementation:

```tsx
const [currentPage, setCurrentPage] = useState(1);
const [perPage, setPerPage] = useState(20);

// Calculate pagination
const totalPages =
  perPage === -1 ? 1 : Math.ceil(filteredOrders.length / perPage);
const paginatedOrders =
  perPage === -1
    ? filteredOrders
    : filteredOrders.slice((currentPage - 1) * perPage, currentPage * perPage);
```

#### User Experience:

- "Showing X to Y of Z orders" indicator
- Dropdown to change items per page
- Responsive pagination controls
- Resets to page 1 when filters change

### 2. Responsive Design

#### Desktop (lg and above):

- Full table view with all columns
- Horizontal scrolling if needed
- Compact design for maximum data visibility

#### Mobile/Tablet (below lg):

- Card-based layout
- Each order in its own card
- All important info visible:
  - Order number
  - Customer name & email
  - Date
  - Items count
  - Total amount
  - Status badges
  - Progress badges (for call center)
  - View button

#### Breakpoint:

- Uses Tailwind's `lg:` breakpoint (1024px)
- `hidden lg:block` for desktop table
- `lg:hidden` for mobile cards

### 3. Skeleton Loader Improvements

#### New Placement:

- Skeleton now appears **below the tabs**
- Shows realistic loading pattern:
  - Search bar skeleton
  - Filter dropdown skeleton
  - Tab skeleton
  - Multiple row skeletons (5 items)

#### Before vs After:

**Before**: Full page skeleton outside the card
**After**: Contextual skeleton inside card structure, below filters and tabs

### 4. Sheet/Sidebar Fix

#### Issue Fixed:

- Props mismatch between `OrdersList` and `OrderDetailSheet`
- Was using `open` and `onOpenChange`, should be `isOpen` and `onClose`

#### Updated Props:

```tsx
interface OrderDetailSheetProps {
  order: any;
  employee: Employee;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}
```

#### Usage:

```tsx
<OrderDetailSheet
  order={selectedOrder}
  employee={employee}
  isOpen={!!selectedOrder}
  onClose={() => setSelectedOrder(null)}
  onUpdate={handleRefresh}
/>
```

### 5. Mobile Card Layout

#### Structure:

```tsx
<Card>
  <CardContent>
    <div className="space-y-3">
      {/* Header with Order # and View button */}
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold">#{order.orderNumber}</div>
          <div className="text-sm text-muted-foreground">{customerName}</div>
          <div className="text-xs text-muted-foreground">{email}</div>
        </div>
        <Button variant="outline" size="sm">
          <Eye className="w-3 h-3" />
          View
        </Button>
      </div>

      {/* Order details in rows */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Date:</span>
        <span>{date}</span>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge>Status</Badge>
        <Badge>Payment</Badge>
        {/* Progress badge for call center */}
      </div>
    </div>
  </CardContent>
</Card>
```

## Technical Implementation

### State Management:

```tsx
const [currentPage, setCurrentPage] = useState(1);
const [perPage, setPerPage] = useState(20);
const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
```

### Pagination Handlers:

```tsx
const handlePageChange = (page: number) => {
  setCurrentPage(page);
};

const handlePerPageChange = (value: string) => {
  const newPerPage = value === "all" ? -1 : parseInt(value);
  setPerPage(newPerPage);
  setCurrentPage(1); // Reset to first page
};
```

### Responsive Table Component:

```tsx
// Desktop Table View
<div className="hidden lg:block overflow-x-auto">
  <Table>...</Table>
</div>

// Mobile Card View
<div className="lg:hidden space-y-3 p-3">
  {orders.map(order => <Card>...</Card>)}
</div>
```

## Pagination UI Components

### Per Page Selector:

```tsx
<Select
  value={perPage === -1 ? "all" : perPage.toString()}
  onValueChange={handlePerPageChange}
>
  <SelectTrigger className="w-24">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="10">10</SelectItem>
    <SelectItem value="20">20</SelectItem>
    <SelectItem value="30">30</SelectItem>
    <SelectItem value="50">50</SelectItem>
    <SelectItem value="all">All</SelectItem>
  </SelectContent>
</Select>
```

### Page Numbers:

```tsx
{
  Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    // Smart calculation to show 5 pages centered on current
    let pageNum;
    if (totalPages <= 5) {
      pageNum = i + 1;
    } else if (currentPage <= 3) {
      pageNum = i + 1;
    } else if (currentPage >= totalPages - 2) {
      pageNum = totalPages - 4 + i;
    } else {
      pageNum = currentPage - 2 + i;
    }

    return (
      <Button
        key={pageNum}
        variant={currentPage === pageNum ? "default" : "outline"}
        size="sm"
        onClick={() => handlePageChange(pageNum)}
      >
        {pageNum}
      </Button>
    );
  });
}
```

## Loading States

### Initial Load:

```tsx
if (loading) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Orders Management</CardTitle>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-10 flex-1" /> {/* Search */}
        <Skeleton className="h-10 w-48" /> {/* Filter */}
        <Skeleton className="h-10 w-full max-w-md" /> {/* Tabs */}
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}
```

### Within Tabs:

```tsx
<TabsContent value="pending">
  {loading ? (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  ) : (
    <>
      <OrdersTable orders={paginatedOrders} />
      {/* Pagination Controls */}
    </>
  )}
</TabsContent>
```

## Benefits

### Performance:

- Only renders 20 orders by default (instead of all)
- Reduces DOM size for large order lists
- Faster initial render and interactions

### User Experience:

- **Mobile-friendly**: Cards are easier to read on small screens
- **Flexible viewing**: Users can choose how many items to see
- **Better navigation**: Easy to jump between pages
- **Clear feedback**: Loading skeletons match the final layout

### Accessibility:

- Proper disabled states on navigation buttons
- Clear labels for all controls
- Semantic HTML structure
- Keyboard navigable pagination

## Testing Checklist

- [ ] Desktop table view displays correctly
- [ ] Mobile card view displays correctly
- [ ] Breakpoint transition (lg: 1024px) works smoothly
- [ ] Pagination controls appear only when needed
- [ ] "All" option shows all orders without pagination
- [ ] Page resets to 1 when filters change
- [ ] Previous/Next buttons disable appropriately
- [ ] Current page is highlighted
- [ ] Page numbers update correctly
- [ ] Per page selector works for all options (10, 20, 30, 50, All)
- [ ] Skeleton loader appears below tabs
- [ ] Skeleton matches final layout structure
- [ ] View button opens sidebar on mobile
- [ ] Sidebar closes properly
- [ ] Both tabs (Pending/Confirmed) have independent pagination
- [ ] Search and filter work with pagination
- [ ] Refresh maintains current page if possible

## Mobile Considerations

### Touch Targets:

- All buttons are at least 44x44 pixels for easy tapping
- Adequate spacing between interactive elements
- Cards have hover/active states

### Layout:

- Full-width cards on mobile
- Proper spacing (p-3) between cards
- No horizontal scrolling required
- All text is readable without zooming

### Performance:

- Lazy loading could be added for very large lists
- Virtual scrolling for "All" option with thousands of orders
- Image lazy loading in mobile cards

## Future Enhancements

1. **URL State Management**: Store page/perPage in URL params
2. **Local Storage**: Remember user's perPage preference
3. **Infinite Scroll**: Option for mobile instead of pagination
4. **Export**: "Export current page" or "Export all" functionality
5. **Bulk Actions**: Select multiple orders for batch operations
6. **Sort Controls**: Click column headers to sort
7. **Advanced Filters**: Date range, amount range, etc.
8. **Search Highlighting**: Highlight matched text in results
9. **Keyboard Shortcuts**: Arrow keys for page navigation
10. **Analytics**: Track which page sizes users prefer
