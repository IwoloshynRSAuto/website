/**
 * Portal Design System
 * 
 * Centralized design tokens and constants for consistent styling across the portal.
 */

// ============================================================================
// COLOR SYSTEM
// ============================================================================

export const COLORS = {
  // Module-specific primary colors
  parts: {
    primary: '#7C3AED', // purple-600
    primaryHover: '#6D28D9', // purple-700
    primaryLight: '#EDE9FE', // purple-50
    primaryDark: '#5B21B6', // purple-800
  },
  jobs: {
    primary: '#2563EB', // blue-600
    primaryHover: '#1D4ED8', // blue-700
    primaryLight: '#DBEAFE', // blue-50
    primaryDark: '#1E40AF', // blue-800
  },
  timesheets: {
    primary: '#F97316', // orange-500
    primaryHover: '#EA580C', // orange-600
    primaryLight: '#FFEDD5', // orange-50
    primaryDark: '#C2410C', // orange-700
  },
  // Neutral colors
  neutral: {
    white: '#FFFFFF',
    gray50: '#F9FAFB',
    gray100: '#F3F4F6',
    gray200: '#E5E7EB',
    gray300: '#D1D5DB',
    gray400: '#9CA3AF',
    gray500: '#6B7280',
    gray600: '#4B5563',
    gray700: '#374151',
    gray800: '#1F2937',
    gray900: '#111827',
    black: '#000000',
  },
  // Status colors
  status: {
    success: '#10B981', // green-500
    warning: '#F59E0B', // amber-500
    error: '#EF4444', // red-500
    info: '#3B82F6', // blue-500
  },
} as const

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const TYPOGRAPHY = {
  // Font sizes
  fontSize: {
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    base: '1rem', // 16px
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
  },
  // Font weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  // Line heights
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
} as const

// ============================================================================
// SPACING SYSTEM (8px rhythm)
// ============================================================================

export const SPACING = {
  xs: '0.25rem', // 4px
  sm: '0.5rem', // 8px
  md: '1rem', // 16px
  lg: '1.5rem', // 24px
  xl: '2rem', // 32px
  '2xl': '3rem', // 48px
} as const

// ============================================================================
// BORDER RADIUS
// ============================================================================

export const BORDER_RADIUS = {
  sm: '0.375rem', // 6px
  md: '0.5rem', // 8px
  lg: '0.75rem', // 12px
  xl: '1rem', // 16px
  '2xl': '1.5rem', // 24px
  full: '9999px',
} as const

// ============================================================================
// SHADOWS
// ============================================================================

export const SHADOWS = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
} as const

// ============================================================================
// BUTTON STYLES
// ============================================================================

export const BUTTON_STYLES = {
  // Base button styles
  base: 'h-10 px-4 text-sm font-medium rounded-lg transition-all duration-150 ease-in-out',
  // Primary button (module-specific)
  primary: {
    parts: 'bg-purple-600 hover:bg-purple-700 text-white rounded-lg',
    jobs: 'bg-blue-600 hover:bg-blue-700 text-white rounded-lg',
    timesheets: 'bg-orange-500 hover:bg-orange-600 text-white rounded-lg',
  },
  // Secondary button
  secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg',
  // Outline button
  outline: 'border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg',
  // Ghost button
  ghost: 'hover:bg-gray-100 text-gray-700 rounded-lg',
  // Destructive button
  destructive: 'bg-red-600 hover:bg-red-700 text-white rounded-lg',
} as const

// ============================================================================
// TABLE STYLES
// ============================================================================

export const TABLE_STYLES = {
  // Table container
  container: 'w-full overflow-x-auto',
  // Table base
  base: 'w-full border-collapse',
  // Table header
  header: 'bg-gray-50 border-b border-gray-200',
  headerCell: 'px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider',
  // Table body
  body: 'bg-white divide-y divide-gray-200',
  row: 'hover:bg-gray-50 transition-colors duration-150 cursor-pointer',
  cell: 'px-4 py-3 text-sm text-gray-900',
  // Table actions
  actionIcon: 'h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors duration-150',
} as const

// ============================================================================
// ICON STYLES
// ============================================================================

export const ICON_STYLES = {
  // Standard icon sizes
  size: {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-8 w-8',
  },
  // Icon colors (module-specific)
  color: {
    parts: 'text-purple-600',
    jobs: 'text-blue-600',
    timesheets: 'text-orange-500',
    neutral: 'text-gray-500',
  },
} as const

// ============================================================================
// CARD STYLES
// ============================================================================

export const CARD_STYLES = {
  base: 'bg-white rounded-xl shadow-md border border-gray-200',
  hover: 'hover:shadow-lg transition-shadow duration-150',
  padding: 'p-6',
} as const

// ============================================================================
// INPUT STYLES
// ============================================================================

export const INPUT_STYLES = {
  base: 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2',
  focus: {
    parts: 'focus:ring-purple-500',
    jobs: 'focus:ring-blue-500',
    timesheets: 'focus:ring-orange-500',
  },
} as const

// ============================================================================
// MODULE UTILITIES
// ============================================================================

/**
 * Get module-specific colors based on module type
 */
export function getModuleColors(module: 'parts' | 'jobs' | 'timesheets') {
  return COLORS[module]
}

/**
 * Get module-specific button styles
 */
export function getModuleButtonStyles(module: 'parts' | 'jobs' | 'timesheets') {
  return BUTTON_STYLES.primary[module]
}

/**
 * Get module-specific hover background color
 */
export function getModuleHoverBg(module: 'parts' | 'jobs' | 'timesheets') {
  const hoverColors = {
    parts: 'hover:bg-purple-50',
    jobs: 'hover:bg-blue-50',
    timesheets: 'hover:bg-orange-50',
  }
  return hoverColors[module]
}

/**
 * Get module-specific icon color
 */
export function getModuleIconColor(module: 'parts' | 'jobs' | 'timesheets') {
  return ICON_STYLES.color[module]
}

