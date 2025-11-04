# Portal Design System Implementation

## 🎨 Color Standardization

### Module Colors (Primary/Hover)
- **Parts**: `#7C3AED` (purple-600) / `purple-50` hover
- **Jobs**: `#2563EB` (blue-600) / `blue-50` hover  
- **Time Sheets**: `#F97316` (orange-500) / `orange-50` hover
- **CRM**: `#14B8A6` (teal) / `teal-50` hover
- **Quotes**: `#F59E0B` (amber) / `amber-50` hover
- **Admin**: `#64748B` (slate) / `slate-50` hover

### Button Colors
All primary buttons use module-specific colors:
- Parts: `bg-purple-600 hover:bg-purple-700 text-white rounded-lg`
- Jobs: `bg-blue-600 hover:bg-blue-700 text-white rounded-lg`
- Time Sheets: `bg-orange-500 hover:bg-orange-600 text-white rounded-lg`

## 📊 Table Standardization

All tables should have:
- **Consistent styling**: `rounded-xl border border-gray-200`
- **Header**: `bg-gray-50 text-xs uppercase tracking-wide font-semibold`
- **Row hover**: Module-specific hover color (`hover:bg-{module}-50`)
- **Transitions**: `transition-colors duration-150`
- **Clickable rows**: `cursor-pointer` (opens detail/edit view)
- **Inline actions**: Edit/Delete icons on hover (h-4 w-4, gray-400 hover:gray-600)

## 🔘 Button Standardization

All buttons should use:
- **Base classes**: `h-10 px-4 text-sm font-medium rounded-lg transition-all duration-150 ease-in-out`
- **Text contrast**: White text on colored backgrounds
- **Module colors**: Use module-specific color for primary buttons
- **Secondary buttons**: `bg-gray-100 hover:bg-gray-200 text-gray-900`
- **Outline buttons**: `border border-gray-300 hover:bg-gray-50 text-gray-700`

## 🎯 Icon Standardization

- **Size**: `h-4 w-4` for inline actions, `h-5 w-5` for headers
- **Color**: Module-specific icon colors (purple/blue/orange)
- **Consistent set**: Use Lucide icons throughout
- **Hover effects**: Smooth color transitions

## ✅ Completed Updates

### Core Files
- ✅ `lib/dashboard-styles.ts` - Updated with timesheets module and standardized colors
- ✅ `lib/design-system.ts` - Created comprehensive design system constants
- ✅ `components/layout/sidebar.tsx` - Added orange color for Time Sheets navigation

### Time Sheets Module
- ✅ `components/timekeeping/create-time-entry-button.tsx` - Updated to orange-500
- ✅ `components/timekeeping/timesheet-sop-modal.tsx` - Updated orange badges to orange-500

### Parts Module
- ✅ Already using purple-600 for buttons
- ✅ Tables using purple-50 hover

### Jobs Module  
- ✅ Already using blue-600 for buttons
- ✅ Tables using blue-50 hover

## 📋 Remaining Tasks

### High Priority
1. **Update all button components** to use module-specific colors:
   - Search for `bg-blue-600` in Parts module → change to `bg-purple-600`
   - Search for `bg-blue-600` in Time Sheets → change to `bg-orange-500`
   - Ensure all buttons have `rounded-lg` and proper transitions

2. **Standardize all table components**:
   - Ensure consistent hover colors per module
   - Add clickable rows where appropriate
   - Standardize inline action icons

3. **Update icon colors** throughout:
   - Parts icons: `text-purple-600`
   - Jobs icons: `text-blue-600`
   - Time Sheets icons: `text-orange-500`

### Medium Priority
4. **Standardize input fields**:
   - Consistent border radius (`rounded-lg`)
   - Module-specific focus rings
   - Consistent padding

5. **Standardize modals/dialogs**:
   - Ensure all use `rounded-2xl`
   - Consistent padding (`p-6`)
   - Backdrop blur effects

## 🔧 Usage Examples

### Button with Module Color
```tsx
// Parts module
<Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all duration-150 ease-in-out">
  Create Part
</Button>

// Jobs module
<Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-150 ease-in-out">
  Create Job
</Button>

// Time Sheets module
<Button className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-all duration-150 ease-in-out">
  Add Time Entry
</Button>
```

### Table Row with Module Hover
```tsx
// Parts module
<TableRow className="hover:bg-purple-50 cursor-pointer transition-colors duration-150">
  ...
</TableRow>

// Jobs module
<TableRow className="hover:bg-blue-50 cursor-pointer transition-colors duration-150">
  ...
</TableRow>

// Time Sheets module
<TableRow className="hover:bg-orange-50 cursor-pointer transition-colors duration-150">
  ...
</TableRow>
```

### Icon with Module Color
```tsx
// Parts
<Package className="h-5 w-5 text-purple-600" />

// Jobs
<Wrench className="h-5 w-5 text-blue-600" />

// Time Sheets
<Clock className="h-5 w-5 text-orange-500" />
```

