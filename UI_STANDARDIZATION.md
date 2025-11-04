# UI/UX Standardization Guide

This document outlines the standardized design system implemented across all dashboards in the RS Automation Portal.

## ✅ Completed Standardizations

### 1. Layout System
- **Sidebar**: Fixed 260px width, dark gray-900 background, module-specific accent colors
- **Header**: Fixed 64px height (h-16), consistent padding (px-6)
- **Main Content**: Standardized padding (px-6 py-4), margin-left for fixed sidebar (lg:ml-[260px])
- **Spacing**: Consistent gaps (gap-4) between sections

### 2. Color System (Module-Specific Accents)
| Module | Accent Color | Usage |
|--------|-------------|-------|
| Jobs | `#3B82F6` (Blue) | Primary buttons, active sidebar items |
| CRM | `#14B8A6` (Teal) | Customer icons, headers |
| Parts | `#8B5CF6` (Purple) | BOM buttons, assembly icons |
| Quotes | `#F59E0B` (Amber) | Quote badges, status indicators |
| Admin | `#64748B` (Slate) | Neutral admin elements |

### 3. Typography
- **H1**: `text-2xl font-semibold text-gray-900`
- **H2**: `text-xl font-semibold text-gray-800`
- **H3**: `text-lg font-medium text-gray-700`
- **Body**: `text-sm text-gray-600 leading-relaxed`
- **Labels**: `text-xs uppercase tracking-wide text-gray-500 font-medium`
- **Table Headers**: `text-xs uppercase tracking-wide text-gray-600 font-semibold`

### 4. Components

#### Cards
- Radius: `rounded-2xl`
- Shadow: `shadow-md hover:shadow-lg`
- Padding: `p-6`
- Border: `border border-gray-200`

#### Buttons
- Radius: `rounded-xl`
- Primary: Uses module accent color
- Secondary: Gray background
- Outline: Border with transparent background
- Transitions: `transition-all duration-150 ease-in-out`

#### Tables
- Max height: `max-h-[70vh] overflow-auto`
- Header: Sticky with `bg-gray-50`, uppercase text
- Row hover: `hover:bg-gray-50`
- Borders: `border-b border-gray-200`
- Cell padding: `py-2 px-3`

#### Modals/Dialogs
- Size: `max-w-lg`
- Radius: `rounded-2xl`
- Padding: `p-6`
- Backdrop: `bg-black/30 backdrop-blur-sm`
- Header: Bold title with light gray subtitle

### 5. BOM Table Fix
- **Fitted layout**: Removed horizontal scroll requirement
- **Compact styling**: Smaller text (text-[11px]), reduced padding
- **Sticky header**: Header stays visible when scrolling
- **Responsive columns**: All columns fit within viewport

## 📋 Standardization Files Created

1. **`lib/dashboard-styles.ts`**: Centralized color system and styling constants
2. **`components/common/standardized-table.tsx`**: Reusable table component
3. **Updated Components**:
   - `components/layout/sidebar.tsx` - Module-specific colors
   - `components/layout/header.tsx` - Fixed height
   - `components/layout/dashboard-page.tsx` - Standardized spacing
   - `components/ui/dialog.tsx` - Backdrop blur, rounded-2xl
   - `components/ui/card.tsx` - Rounded-2xl, consistent shadows
   - `components/ui/button.tsx` - Standardized variants

## 🎯 Next Steps for Full Standardization

To complete the standardization pass, apply these patterns to:

1. **All dashboard pages**:
   - Use `DashboardPageContainer`, `DashboardHeader`, `DashboardContent`
   - Apply module-specific accent colors to headers and buttons
   - Use standardized table component or apply table styles

2. **All dialogs/modals**:
   - Use shadcn Dialog with backdrop blur
   - Apply rounded-2xl and consistent padding

3. **All buttons**:
   - Use module accent colors for primary actions
   - Apply consistent sizing and transitions

4. **All cards**:
   - Use rounded-2xl and shadow-md
   - Consistent padding (p-6)

## 🔧 Usage Examples

### Using Module Colors
```typescript
import { MODULE_COLORS } from '@/lib/dashboard-styles'

// Get colors for current module
const colors = MODULE_COLORS.parts
// colors.primary = '#8B5CF6'
```

### Using Standardized Table
```typescript
import { StandardizedTable } from '@/components/common/standardized-table'

<StandardizedTable
  data={items}
  columns={columns}
  searchFields={['name', 'email']}
  onRowClick={(item) => router.push(`/detail/${item.id}`)}
/>
```

### Using Dashboard Layout
```typescript
import { DashboardPageContainer, DashboardHeader, DashboardContent } from '@/components/layout/dashboard-page'

<DashboardPageContainer>
  <DashboardHeader title="Page Title" subtitle="Description">
    <Button>Action</Button>
  </DashboardHeader>
  <DashboardContent>
    {/* Content */}
  </DashboardContent>
</DashboardPageContainer>
```

