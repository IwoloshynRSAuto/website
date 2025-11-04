/**
 * Standardization Utilities
 * 
 * This file provides standardized styles, colors, and components
 * to ensure consistency across the entire portal.
 * Based on the Parts Dashboard design system.
 */

import { MODULE_COLORS } from './dashboard-styles'
import { cn } from './utils'

export type ModuleType = 'parts' | 'jobs' | 'timesheets' | 'crm' | 'quotes' | 'admin'

/**
 * Get standardized button classes for a module
 */
export function getModuleButtonClass(module: ModuleType, variant: 'primary' | 'secondary' | 'outline' = 'primary') {
  const colors = MODULE_COLORS[module]
  
  switch (variant) {
    case 'primary':
      return cn(
        'px-4 py-2 rounded-xl font-medium transition-all duration-150 ease-in-out',
        'text-white',
        `bg-${colors.name}-600 hover:bg-${colors.name}-700`
      )
    case 'secondary':
      return 'px-4 py-2 rounded-xl font-medium bg-gray-100 hover:bg-gray-200 transition-all duration-150 ease-in-out'
    case 'outline':
      return cn(
        'px-4 py-2 rounded-xl font-medium border-2 transition-all duration-150 ease-in-out',
        `border-${colors.name}-300 hover:border-${colors.name}-400`
      )
    default:
      return ''
  }
}

/**
 * Standardized table row hover color based on module
 */
export function getTableRowHoverClass(module: ModuleType) {
  const colors = MODULE_COLORS[module]
  return cn(
    'cursor-pointer transition-colors duration-150',
    `hover:bg-${colors.name}-50`
  )
}

/**
 * Standardized card classes
 */
export const standardCardClasses = cn(
  'bg-white rounded-2xl shadow-md border border-gray-200',
  'p-6',
  'hover:shadow-lg transition-shadow duration-200'
)

/**
 * Standardized table container
 */
export const standardTableContainer = 'overflow-x-auto max-h-[calc(100vh-350px)] overflow-y-auto'

/**
 * Standardized table header
 */
export const standardTableHeader = 'sticky top-0 bg-white z-10'

/**
 * Standardized table header cell
 */
export const standardTableHeaderCell = 'text-xs uppercase tracking-wide text-gray-600 font-semibold'

/**
 * Standardized table body cell
 */
export const standardTableBodyCell = 'text-xs text-gray-700'

/**
 * Standardized action button (edit/delete icons)
 */
export const standardActionButton = 'h-8 w-8 p-0'

/**
 * Standardized modal/dialog classes
 */
export const standardModalClasses = {
  overlay: 'bg-black/30 backdrop-blur-sm',
  content: 'max-w-lg rounded-2xl p-6',
}

/**
 * Standardized input classes
 */
export const standardInputClasses = 'rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500'

/**
 * Standardized search bar classes
 */
export const standardSearchBarClasses = 'pl-10 rounded-xl border-gray-300'

/**
 * Standardized page header classes
 */
export const standardPageHeader = {
  title: 'text-2xl font-semibold text-gray-900',
  subtitle: 'text-sm text-gray-600 mt-1 leading-relaxed',
}

/**
 * Standardized icon sizes
 */
export const iconSizes = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
}

/**
 * Standardized spacing
 */
export const spacing = {
  section: 'mb-6',
  card: 'p-6',
  button: 'px-4 py-2',
}

