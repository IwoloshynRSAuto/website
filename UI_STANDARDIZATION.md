# UI Standardization Guide

Complete guide to UI components, patterns, and standardization practices for the Timekeeping Portal.

## Overview

The application uses **shadcn/ui** components built on **Radix UI** primitives with **Tailwind CSS** styling. This guide documents the standardized components and best practices.

## Component Library

### Available UI Components

All components are located in `components/ui/` and follow shadcn/ui patterns:

#### Layout Components
- `card.tsx` - Card container with header, content, footer
- `separator.tsx` - Visual separator
- `sheet.tsx` - Side panel/sheet
- `aspect-ratio.tsx` - Maintain aspect ratios

#### Form Components
- `button.tsx` - Button with variants
- `input.tsx` - Text input
- `textarea.tsx` - Multi-line text input
- `select.tsx` - Dropdown select
- `checkbox.tsx` - Checkbox input
- `radio-group.tsx` - Radio button group
- `switch.tsx` - Toggle switch
- `label.tsx` - Form label
- `form.tsx` - Form wrapper with validation

#### Date/Time Components
- `calendar.tsx` - Calendar picker
- `date-picker.tsx` - Date picker
- `date-range-picker.tsx` - Date range picker
- `simple-date-picker.tsx` - Simplified date picker
- `time-picker.tsx` - Time picker

#### Data Display
- `table.tsx` - Table with header, body, rows, cells
- `badge.tsx` - Status badges
- `avatar.tsx` - User avatars
- `progress.tsx` - Progress bars
- `timeline.tsx` - Timeline display

#### Overlays
- `dialog.tsx` - Modal dialog
- `alert-dialog.tsx` - Confirmation dialogs
- `popover.tsx` - Popover tooltip
- `tooltip.tsx` - Tooltip
- `hover-card.tsx` - Hover card
- `dropdown-menu.tsx` - Dropdown menu
- `context-menu.tsx` - Context menu

#### Navigation
- `tabs.tsx` - Tab navigation
- `accordion.tsx` - Accordion/collapsible
- `collapsible.tsx` - Collapsible content
- `navigation-menu.tsx` - Navigation menu
- `menubar.tsx` - Menu bar

#### Feedback
- `toast.tsx` - Toast notifications
- `toaster.tsx` - Toast container
- `alert.tsx` - Alert messages
- `progress.tsx` - Loading progress

#### Advanced
- `command.tsx` - Command palette
- `carousel.tsx` - Carousel/slider
- `slider.tsx` - Range slider
- `stepper.tsx` - Step indicator
- `rich-text-editor.tsx` - Rich text editor
- `multi-select.tsx` - Multi-select dropdown
- `searchable-select.tsx` - Searchable select
- `input-otp.tsx` - OTP input
- `pin-input.tsx` - PIN input
- `phone-input.tsx` - Phone number input
- `scroll-area.tsx` - Scrollable area
- `toggle.tsx` - Toggle button
- `toggle-group.tsx` - Toggle group
- `toggle-card.tsx` - Toggleable card

### New Standardized Components (PR 7)

These components were added in PR 7 for consistency:

#### `card.tsx` - Standardized Card
```typescript
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
  <CardFooter>
    Footer actions
  </CardFooter>
</Card>
```

#### `table.tsx` - Standardized Table
```typescript
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Column 1</TableHead>
      <TableHead>Column 2</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Data 1</TableCell>
      <TableCell>Data 2</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

#### `confirm-dialog.tsx` - Confirmation Dialog
```typescript
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

<ConfirmDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  title="Delete Item?"
  description="This action cannot be undone."
  onConfirm={handleDelete}
  variant="destructive"
  confirmLabel="Delete"
  cancelLabel="Cancel"
/>
```

#### `search-input.tsx` - Search Input
```typescript
import { SearchInput } from '@/components/ui/search-input'

<SearchInput
  value={searchTerm}
  onChange={setSearchTerm}
  placeholder="Search..."
  onClear={() => setSearchTerm('')}
/>
```

#### `paginated-table.tsx` - Paginated Table
```typescript
import { PaginatedTable } from '@/components/ui/paginated-table'

<PaginatedTable
  data={items}
  columns={[
    { key: 'id', header: 'ID', render: (item) => item.id },
    { key: 'name', header: 'Name', render: (item) => item.name },
  ]}
  pageSize={10}
  onRowClick={(item) => handleClick(item)}
  emptyMessage="No items found"
/>
```

#### `file-uploader.tsx` - File Uploader
```typescript
import { FileUploader } from '@/components/ui/file-uploader'

<FileUploader
  onUpload={async (file) => {
    await uploadFile(file)
  }}
  accept=".pdf,.doc,.docx"
  maxSizeMB={5}
  multiple={false}
  label="Upload File"
  description="PDF, DOC, or DOCX files up to 5MB"
/>
```

## Form Standardization

### Using React Hook Form + Zod

All forms should use the standardized form hook:

```typescript
import { useFormWithValidation } from '@/lib/forms/useFormWithValidation'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  age: z.number().min(18, 'Must be 18+'),
})

function MyForm() {
  const form = useFormWithValidation({
    schema,
    onSubmit: async (data) => {
      await fetch('/api/endpoint', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    successMessage: 'Form submitted successfully',
    errorMessage: 'Failed to submit form',
  })

  return (
    <form onSubmit={form.handleSubmit}>
      <div>
        <label>Name</label>
        <input {...form.register('name')} />
        {form.formState.errors.name && (
          <span className="error">{form.formState.errors.name.message}</span>
        )}
      </div>
      
      <button type="submit" disabled={form.isSubmitting}>
        {form.isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  )
}
```

### Form Component Pattern

Use the Form component from shadcn/ui for better integration:

```typescript
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Name</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <Button type="submit">Submit</Button>
  </form>
</Form>
```

## Component Usage Guidelines

### When to Use Which Component

#### Cards
- Use `Card` for content containers
- Use `CardHeader` for titles and descriptions
- Use `CardContent` for main content
- Use `CardFooter` for actions

#### Tables
- Use `Table` for data display
- Use `PaginatedTable` for large datasets
- Always include `TableHeader` with `TableHead`
- Use `TableBody` with `TableRow` and `TableCell`

#### Dialogs
- Use `Dialog` for modals
- Use `ConfirmDialog` for confirmations
- Use `AlertDialog` for critical actions
- Always provide close/cancel options

#### Forms
- Use `Input` for text input
- Use `Select` for dropdowns
- Use `Textarea` for multi-line text
- Use `Checkbox` for boolean options
- Use `RadioGroup` for single choice
- Always include `Label` for accessibility

#### Buttons
- Use `variant="default"` for primary actions
- Use `variant="outline"` for secondary actions
- Use `variant="destructive"` for delete/danger
- Use `variant="ghost"` for subtle actions
- Use `size="sm"` for compact buttons
- Use `size="lg"` for prominent buttons

#### Badges
- Use for status indicators
- Use color variants: default, secondary, destructive, outline
- Keep text short and descriptive

## Styling Standards

### Tailwind CSS Classes

Use Tailwind utility classes consistently:

```typescript
// Spacing
className="p-4"        // Padding
className="m-2"        // Margin
className="space-y-4"  // Vertical spacing

// Layout
className="flex"       // Flexbox
className="grid"       // Grid
className="w-full"     // Full width

// Colors
className="bg-primary"     // Primary background
className="text-muted"     // Muted text
className="border"         // Border

// States
className="hover:bg-accent"    // Hover
className="disabled:opacity-50" // Disabled
className="focus:ring-2"        // Focus
```

### Color System

Use semantic color tokens:

- `primary` - Primary brand color
- `secondary` - Secondary color
- `accent` - Accent color
- `muted` - Muted/subdued
- `destructive` - Error/danger
- `success` - Success state
- `warning` - Warning state

### Typography

```typescript
// Headings
className="text-2xl font-semibold"  // h1
className="text-xl font-semibold"   // h2
className="text-lg font-medium"     // h3

// Body
className="text-sm"                 // Small text
className="text-base"               // Base text
className="text-muted-foreground"   // Muted text
```

## Accessibility Standards

### Required Attributes

- All interactive elements need `aria-label` or visible labels
- Form inputs must have associated labels
- Buttons should have descriptive text
- Images need alt text
- Focus states must be visible

### Keyboard Navigation

- All interactive elements must be keyboard accessible
- Tab order should be logical
- Escape key should close modals
- Enter key should submit forms

### Screen Readers

- Use semantic HTML elements
- Provide ARIA labels where needed
- Use `role` attributes appropriately
- Ensure proper heading hierarchy

## Responsive Design

### Breakpoints

```typescript
// Mobile first approach
className="w-full md:w-1/2 lg:w-1/3"  // Responsive width
className="flex-col md:flex-row"      // Responsive layout
className="text-sm md:text-base"      // Responsive text
```

### Mobile Considerations

- Touch targets should be at least 44x44px
- Forms should stack vertically on mobile
- Tables should scroll horizontally on mobile
- Modals should be full-screen on mobile

## Error Handling

### Form Errors

```typescript
// Display errors inline
{form.formState.errors.fieldName && (
  <p className="text-sm text-destructive">
    {form.formState.errors.fieldName.message}
  </p>
)}

// Use FormMessage component
<FormMessage />
```

### Toast Notifications

```typescript
import { toast } from 'react-hot-toast'

// Success
toast.success('Operation completed')

// Error
toast.error('Operation failed')

// Loading
const toastId = toast.loading('Processing...')
toast.success('Done!', { id: toastId })
```

## Loading States

### Button Loading

```typescript
<Button disabled={isLoading}>
  {isLoading ? 'Loading...' : 'Submit'}
</Button>
```

### Skeleton Loading

```typescript
// Use skeleton components for loading states
<div className="animate-pulse">
  <div className="h-4 bg-muted rounded w-3/4"></div>
</div>
```

## Best Practices

### 1. Component Composition
- Compose smaller components into larger ones
- Keep components focused and reusable
- Use props for customization

### 2. Type Safety
- Use TypeScript for all components
- Define proper prop types
- Use Zod for validation

### 3. Performance
- Use React.memo for expensive components
- Lazy load heavy components
- Optimize re-renders

### 4. Consistency
- Use shared components from `components/ui/`
- Follow naming conventions
- Maintain consistent spacing

### 5. Documentation
- Document component props
- Provide usage examples
- Note any special considerations

## Migration Guide

### Migrating Existing Components

1. **Identify Custom Components**
   - Find components that duplicate UI functionality
   - Check if equivalent exists in `components/ui/`

2. **Replace with Standard Components**
   - Replace custom cards with `Card`
   - Replace custom tables with `Table`
   - Replace custom dialogs with `Dialog`

3. **Update Styling**
   - Use Tailwind classes instead of custom CSS
   - Use semantic color tokens
   - Follow spacing standards

4. **Update Forms**
   - Migrate to `useFormWithValidation`
   - Use Zod schemas for validation
   - Use Form components from shadcn/ui

## Examples

### Complete Form Example

```typescript
'use client'

import { useFormWithValidation } from '@/lib/forms/useFormWithValidation'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
})

export function UserForm() {
  const form = useFormWithValidation({
    schema,
    onSubmit: async (data) => {
      await fetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create User</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              {...form.register('name')}
              className={form.formState.errors.name ? 'border-destructive' : ''}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
          
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...form.register('email')}
              className={form.formState.errors.email ? 'border-destructive' : ''}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>
          
          <CardFooter>
            <Button type="submit" disabled={form.isSubmitting}>
              {form.isSubmitting ? 'Creating...' : 'Create User'}
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  )
}
```

### Table with Pagination Example

```typescript
import { PaginatedTable } from '@/components/ui/paginated-table'

export function UsersTable({ users }) {
  return (
    <PaginatedTable
      data={users}
      columns={[
        {
          key: 'name',
          header: 'Name',
          render: (user) => user.name,
        },
        {
          key: 'email',
          header: 'Email',
          render: (user) => user.email,
        },
        {
          key: 'role',
          header: 'Role',
          render: (user) => (
            <Badge variant="secondary">{user.role}</Badge>
          ),
        },
      ]}
      pageSize={10}
      onRowClick={(user) => router.push(`/users/${user.id}`)}
      emptyMessage="No users found"
    />
  )
}
```

## Resources

- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Radix UI Documentation](https://www.radix-ui.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [React Hook Form Documentation](https://react-hook-form.com/)
- [Zod Documentation](https://zod.dev/)

---

**For questions or issues:** See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) or review component source code in `components/ui/`.
