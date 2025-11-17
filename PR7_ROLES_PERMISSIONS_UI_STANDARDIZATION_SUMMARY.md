# PR 7: Roles & Permissions Centralization + UI Standardization

## Summary

This PR centralizes role-based access control with a capability-based authorization system and standardizes UI components and form architecture across the application. It replaces scattered role checks with a centralized `authorize()` helper and provides reusable UI components.

## Changed Files

### New Files

#### Authorization Module
- `lib/auth/authorization.ts` - Centralized authorization with role capability map

#### Shared UI Components
- `components/ui/card.tsx` - Standardized Card component
- `components/ui/table.tsx` - Standardized Table component
- `components/ui/confirm-dialog.tsx` - Standardized confirmation dialog
- `components/ui/search-input.tsx` - Standardized search input
- `components/ui/paginated-table.tsx` - Standardized paginated table
- `components/ui/file-uploader.tsx` - Standardized file uploader

#### Form Standardization
- `lib/forms/useFormWithValidation.ts` - Standardized form hook with React Hook Form + Zod

### Modified Files

- `app/api/users/route.ts` - Updated to use `authorize()` helper, standardized response format
- `app/api/timesheet-submissions/route.ts` - Updated to use `authorizeOwnResource()` helper
- `app/api/timesheets/route.ts` - Updated to use `authorizeOwnResource()` helper

## Key Features

### 1. Centralized Authorization

**Role Capability Map:**
- `ADMIN` - Full access to all resources
- `PROJECT_MANAGER` - Can approve/reject, manage projects, view analytics
- `ENGINEER` - Can create/update quotes, jobs, BOMs
- `TECHNICIAN` - Can submit timesheets, create service reports
- `SALES` - Can manage quotes, part sales, customers, vendors
- `ACCOUNTING` - Can approve expenses, timesheets, manage POs
- `CLIENT_PORTAL` - Read-only access to own resources
- `USER` (legacy) - Maps to TECHNICIAN
- `MANAGER` (legacy) - Maps to PROJECT_MANAGER

**Authorization Functions:**
- `authorize(user, action, resource)` - Check if user can perform action
- `authorizeOwnResource(user, action, resource, resourceUserId)` - Check with ownership
- `getCapabilities(user, resource)` - Get all capabilities for resource
- `hasAnyCapability(user, resource)` - Check if user has any capability
- `isAdmin(user)` - Check if user is admin
- `isManagerOrAbove(user)` - Check if user is manager or above

### 2. Shared UI Components

**Card Component:**
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
- Consistent styling and structure

**Table Component:**
- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`
- Consistent table styling

**ConfirmDialog Component:**
- Standardized confirmation dialogs
- Supports destructive and default variants
- Loading states

**SearchInput Component:**
- Standardized search input with icon
- Clear button
- Consistent styling

**PaginatedTable Component:**
- Generic paginated table component
- Configurable columns
- Row click handlers
- Empty state support

**FileUploader Component:**
- Standardized file upload UI
- File size validation
- File type validation
- Multiple file support
- Upload progress

### 3. Form Standardization

**useFormWithValidation Hook:**
- Wraps React Hook Form with Zod validation
- Consistent error handling
- Toast notifications
- Loading states
- Success/error callbacks

**Helper Functions:**
- `getFieldError()` - Get field error message
- `hasFieldError()` - Check if field has error

## API Changes

### Authorization Usage

**Before:**
```typescript
if (session.user.role !== 'ADMIN') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

**After:**
```typescript
import { authorize } from '@/lib/auth/authorization'

if (!authorize(session.user, 'read', 'user')) {
  return NextResponse.json(
    { success: false, error: 'Forbidden: Insufficient permissions' },
    { status: 403 }
  )
}
```

**Own Resource Check:**
```typescript
import { authorizeOwnResource } from '@/lib/auth/authorization'

if (!authorizeOwnResource(session.user, 'update', 'timesheet', timesheet.userId)) {
  return NextResponse.json(
    { success: false, error: 'Forbidden: Insufficient permissions' },
    { status: 403 }
  )
}
```

## Role Capabilities

### ADMIN
- Full access to all resources
- Can manage users and roles
- Can approve/reject all submissions
- Can view all analytics

### PROJECT_MANAGER
- Can approve/reject timesheets, expenses, time-off
- Can create/update jobs, quotes, part sales
- Can manage vendors, customers
- Can view analytics

### ENGINEER
- Can create/update quotes, jobs, BOMs
- Can submit timesheets, expenses
- Can create service reports
- Read-only access to users

### TECHNICIAN
- Can submit own timesheets, expenses
- Can create service reports
- Read-only access to most resources

### SALES
- Can manage quotes, part sales
- Can manage customers, vendors
- Can view analytics
- Read-only access to jobs

### ACCOUNTING
- Can approve/reject timesheets, expenses, time-off
- Can manage purchase orders
- Can view analytics
- Read-only access to jobs, quotes

### CLIENT_PORTAL
- Read-only access to own jobs, quotes, part sales
- Read-only access to own customer record

## Migration Steps

### 1. No Database Changes Required
Authorization is handled in application code.

### 2. Update API Endpoints (Gradual)
Replace scattered role checks with `authorize()` helper:

```typescript
// Old
if (session.user.role !== 'ADMIN') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// New
import { authorize } from '@/lib/auth/authorization'
if (!authorize(session.user, 'read', 'user')) {
  return NextResponse.json(
    { success: false, error: 'Forbidden: Insufficient permissions' },
    { status: 403 }
  )
}
```

### 3. Use Shared UI Components
Replace custom components with shared ones:

```typescript
// Old: Custom card
<div className="border rounded-lg p-4">...</div>

// New: Shared Card
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

### 4. Use Standardized Forms
Use `useFormWithValidation` hook:

```typescript
import { useFormWithValidation } from '@/lib/forms/useFormWithValidation'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
})

const form = useFormWithValidation({
  schema,
  onSubmit: async (data) => {
    await api.create(data)
  },
})
```

## Breaking Changes

### API Response Format
- User API endpoints now return `{ success: boolean, data?, error? }` format
- Frontend code using old format needs updating

### Role Checks
- Old: Direct `session.user.role !== 'ADMIN'` checks
- New: Use `authorize()` helper
- Existing code will continue to work but should be migrated

## Testing Checklist

- [ ] Admin can access all resources → All authorize() checks pass
- [ ] Project Manager can approve timesheets → authorize() returns true
- [ ] Technician can only submit own timesheets → authorizeOwnResource() works
- [ ] Sales can create quotes → authorize() returns true
- [ ] Accounting can approve expenses → authorize() returns true
- [ ] Client Portal can only read own resources → Limited access
- [ ] Card component renders correctly → UI displays properly
- [ ] Table component renders correctly → UI displays properly
- [ ] ConfirmDialog works → Dialog opens and confirms
- [ ] SearchInput works → Search filters correctly
- [ ] PaginatedTable works → Pagination functions correctly
- [ ] FileUploader works → Files upload successfully
- [ ] useFormWithValidation works → Forms submit with validation

## Next Steps (Future PRs)

- Migrate all API endpoints to use authorize() helper
- Update all UI components to use shared components
- Create form templates for common forms
- Add role management UI
- Add permission testing utilities
- Add role-based UI visibility helpers
- Create authorization middleware for API routes

## Notes

- Authorization is capability-based, not role-based
- Roles map to capability sets
- Users can access their own resources even without explicit capability
- Legacy roles (USER, MANAGER) are automatically mapped
- All shared UI components use Tailwind CSS and shadcn/ui patterns
- Form hook provides consistent error handling and toast notifications
- Components are accessible and mobile-responsive
- Authorization checks are type-safe with TypeScript

