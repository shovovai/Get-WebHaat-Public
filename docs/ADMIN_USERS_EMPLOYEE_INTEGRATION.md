# Admin Users - Employee Assignment Integration

## Overview

The Admin Users page (`/admin/users`) now includes employee role assignment functionality, allowing administrators to assign and manage employee roles directly from the user management interface without navigating to the separate `/admin/employees` page.

## Features Added

### 1. Employee Role Assignment

- **Assign Button**: Users in Sanity can be assigned employee roles via a dialog
- **Remove Button**: Existing employees can have their roles removed
- **Role Selection**: Choose from 5 employee roles:
  - Call Center
  - Packer
  - Delivery Man
  - Incharge
  - Accounts

### 2. Visual Indicators

- **Employee Badge**: Shows in the status column for users with employee roles
- **Action Buttons**:
  - Briefcase icon button for employee assignment/removal
  - Different colors: Secondary (assign) vs Outline (remove)

### 3. Permission Preview

The assignment dialog shows role-specific permissions:

- **Call Center**: Confirm address, confirm orders, view orders
- **Packer**: View confirmed orders, mark as packed
- **Delivery Man**: View deliveries, mark delivered, collect cash
- **Incharge**: Monitor orders, assign deliverymen, view analytics
- **Accounts**: Receive payments, view analytics, monitor orders

### 4. Responsive Design

- **Desktop**: Icon-only buttons in table actions
- **Mobile**: Text + icon buttons in card layout

## Technical Implementation

### Files Modified

1. **components/admin/AdminUsers.tsx**

   - Added employee-related imports (Briefcase icon, Dialog components, employee actions)
   - Updated `CombinedUser` interface with employee fields
   - Added `employeeDialog` state management
   - Implemented handler functions:
     - `openEmployeeDialog(user)` - Opens assignment dialog
     - `closeEmployeeDialog()` - Closes dialog
     - `handleAssignEmployee()` - Assigns role to user
     - `handleRemoveEmployee(sanityId, userName)` - Removes employee role
   - Added employee badges in status column
   - Added employee buttons in table and mobile layouts
   - Created Employee Assignment Dialog component

2. **app/api/admin/users/combined/route.ts**
   - Updated `SanityUser` interface with employee fields
   - Modified response to include `isEmployee`, `employeeRole`, `employeeStatus`

### Server Actions Used

- `assignEmployeeRole(sanityId, role)` - From `/actions/employeeActions.ts`
- `removeEmployeeRole(sanityId)` - From `/actions/employeeActions.ts`

### State Management

```typescript
const [employeeDialog, setEmployeeDialog] = useState<{
  isOpen: boolean;
  user: CombinedUser | null;
  selectedRole: EmployeeRole;
  isAssigning: boolean;
}>({
  isOpen: false,
  user: null,
  selectedRole: "callcenter",
  isAssigning: false,
});
```

## User Flow

### Assigning Employee Role

1. Admin clicks Briefcase icon button next to a user (in Sanity)
2. Dialog opens with role selector
3. Admin selects desired role and sees permission preview
4. Admin clicks "Assign Role"
5. System validates user is in Sanity
6. Role is assigned via server action
7. Success toast appears
8. User list refreshes
9. Employee badge appears in status column

### Removing Employee Role

1. Admin clicks Briefcase icon (outline style) for employee
2. Confirmation dialog appears
3. Admin confirms removal
4. Role is removed via server action
5. Success toast appears
6. User list refreshes
7. Employee badge disappears

## Integration with Employee System

This feature integrates seamlessly with the existing employee management system:

- **Synced Data**: Changes made here reflect in `/admin/employees`
- **Same Actions**: Uses the same server actions as the dedicated employee page
- **Same Permissions**: Role permissions remain consistent
- **Order Management**: Employees assigned here can access `/admin/orders` with their role-based permissions

## Benefits

1. **Convenience**: No need to switch between pages
2. **Efficiency**: Quickly assign roles while reviewing users
3. **Context**: See all user details while assigning employee role
4. **Consistency**: Uses same system as dedicated employee management page

## Validation & Error Handling

- Users must be in Sanity database before role assignment
- Clear error messages via toast notifications
- Loading states during async operations
- Confirmation prompts for role removal
- Disabled states prevent duplicate actions

## Responsive Behavior

### Desktop (Large Screens)

- Icon-only buttons save space
- Badges display inline with status
- Tooltips on hover for clarity

### Mobile & Tablet

- Text labels on buttons for clarity
- Stacked layout for better touch targets
- Full permission list in dialog

## Accessibility

- Proper button labels and titles
- Keyboard navigation support
- Screen reader friendly dialog
- Clear action feedback via toasts

## Future Enhancements

Potential improvements:

- Bulk employee assignment
- Role change without removal
- Employee activity log in user details
- Filter users by employee role
- Export employee list from users page
