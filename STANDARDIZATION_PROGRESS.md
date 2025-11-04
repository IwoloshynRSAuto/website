# Portal Standardization Progress

## Overview
Standardizing the entire portal to match the Parts Dashboard design system.

## ✅ Completed

### 1. Foundation Components
- ✅ Dialog component: Already standardized (rounded-2xl, max-w-lg, animations)
- ✅ Button component: Already standardized (rounded-xl, transitions)
- ✅ Dashboard layout components: Already standardized
- ✅ Created `standardized-clickable-table.tsx` reusable component
- ✅ Created `standardization-utils.tsx` utility file

### 2. Color Standardization
- ✅ Parts module buttons: Changed from blue-600 to purple-600 (matching module color)
- ✅ BOMs table: hover:bg-purple-50 (matching Parts module)
- ✅ Packages table: hover:bg-purple-50 (matching Parts module)
- ✅ Quotes table: hover:bg-amber-50 (matching Quotes module)
- ✅ Jobs table: hover:bg-blue-50 (matching Jobs module)

### 3. Table Standardization
- ✅ Parts table: Already has clickable rows, hover effects, inline actions
- ✅ BOMs table: Updated hover color to purple-50
- ✅ Packages table: Updated hover color to purple-50
- ✅ Quotes table: Updated hover color to amber-50
- ✅ Jobs table: Updated hover color to blue-50

## 🔄 In Progress

### Button Styles
- Need to update all module-specific buttons to use module colors:
  - Parts: purple-600
  - Jobs: blue-600
  - CRM: teal-600
  - Quotes: amber-600
  - Admin: slate-600

### Table Components
- All tables should have:
  - Clickable rows (cursor-pointer)
  - Module-specific hover colors
  - Smooth transitions (duration-150)
  - Inline action icons (Edit, Delete) on hover
  - Consistent padding (py-2 px-3)

## 📋 Remaining Tasks

### High Priority
1. **Standardize all table components** across:
   - Parts Services table
   - Customers table
   - Employees table
   - Labor Codes table
   - Assemblies list view
   - Any other tables

2. **Update all button colors** to match module:
   - Search all `bg-blue-600` in Parts module → change to `bg-purple-600`
   - Search all `bg-blue-600` in Jobs module → keep as `bg-blue-600`
   - Search all `bg-blue-600` in CRM module → change to `bg-teal-600`
   - Search all `bg-blue-600` in Quotes module → change to `bg-amber-600`

3. **Standardize icons**:
   - All icons should be consistent size (h-4 w-4 for inline, h-5 w-5 for headers)
   - Module-specific icon colors (purple for Parts, blue for Jobs, etc.)

4. **Standardize search/filter bars**:
   - Consistent placement (below header, above table)
   - Consistent styling (rounded-xl, padding, borders)
   - Consistent icon placement (Search icon on left)

5. **Standardize page headers**:
   - All use DashboardHeader component
   - Consistent title/subtitle styling
   - Consistent button placement

### Medium Priority
6. **Remove/minimize Action buttons**:
   - Replace Action columns with inline icons
   - Show icons on row hover
   - Use Edit and Delete icons consistently

7. **Add smooth animations**:
   - Fade transitions for modals (already done)
   - Slide transitions for dropdowns
   - Smooth hover effects (already done)

8. **Standardize badges**:
   - Consistent colors for statuses
   - Module-specific accent colors

### Low Priority
9. **Standardize cards**:
   - All use Card component with rounded-2xl
   - Consistent padding (p-6)
   - Consistent shadows

10. **Standardize breadcrumbs**:
    - Consistent placement and styling

## Module Color Mapping

| Module | Primary Color | Hover Color | Button Color |
|--------|--------------|-------------|--------------|
| Parts | purple-600 | purple-50 | bg-purple-600 hover:bg-purple-700 |
| Jobs | blue-600 | blue-50 | bg-blue-600 hover:bg-blue-700 |
| CRM | teal-600 | teal-50 | bg-teal-600 hover:bg-teal-700 |
| Quotes | amber-600 | amber-50 | bg-amber-600 hover:bg-amber-700 |
| Admin | slate-600 | slate-50 | bg-slate-600 hover:bg-slate-700 |

## Files Modified
- `components/boms/boms-list-view.tsx` - Button color, hover
- `components/parts/packages-list-view.tsx` - Button color, hover
- `components/parts/parts-database-view.tsx` - Button color
- `components/parts/quotes-list-view.tsx` - Hover color
- `components/jobs/jobs-table.tsx` - Hover color
- `components/common/standardized-clickable-table.tsx` - New reusable component
- `lib/standardization-utils.tsx` - New utility file

## Next Steps
1. Continue updating all table components to use module-specific colors
2. Update all button instances to use module colors
3. Standardize icon sizes and colors
4. Add row hover animations where missing
5. Replace Action columns with inline icons

