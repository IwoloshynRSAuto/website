/**
 * Standardized Dashboard Styles and Colors
 * 
 * This file defines the consistent color system and styling patterns
 * used across all dashboard modules in the portal.
 */

export const MODULE_COLORS = {
  parts: {
    primary: '#7C3AED', // Purple-600 (standardized)
    name: 'purple',
    shades: {
      50: '#F5F3FF',
      100: '#EDE9FE',
      500: '#A855F7',
      600: '#7C3AED',
      700: '#6D28D9',
    }
  },
  jobs: {
    primary: '#2563EB', // Blue-600 (standardized)
    name: 'blue',
    shades: {
      50: '#EFF6FF',
      100: '#DBEAFE',
      500: '#3B82F6',
      600: '#2563EB',
      700: '#1D4ED8',
    }
  },
  timesheets: {
    primary: '#F97316', // Orange-500 (standardized)
    name: 'orange',
    shades: {
      50: '#FFF7ED',
      100: '#FFEDD5',
      500: '#F97316',
      600: '#EA580C',
      700: '#C2410C',
    }
  },
  crm: {
    primary: '#14B8A6', // Teal
    name: 'teal',
    shades: {
      50: '#F0FDFA',
      100: '#CCFBF1',
      500: '#14B8A6',
      600: '#0D9488',
      700: '#0F766E',
    }
  },
  quotes: {
    primary: '#F59E0B', // Amber
    name: 'amber',
    shades: {
      50: '#FFFBEB',
      100: '#FEF3C7',
      500: '#F59E0B',
      600: '#D97706',
      700: '#B45309',
    }
  },
  admin: {
    primary: '#64748B', // Slate
    name: 'slate',
    shades: {
      50: '#F8FAFC',
      100: '#F1F5F9',
      500: '#64748B',
      600: '#475569',
      700: '#334155',
    }
  },
} as const

export type ModuleType = keyof typeof MODULE_COLORS

/**
 * Get module color classes for Tailwind
 */
export function getModuleColors(module: ModuleType) {
  const colors = MODULE_COLORS[module]
  return {
    bg: `bg-${colors.name}-50`,
    bgHover: `hover:bg-${colors.name}-100`,
    text: `text-${colors.name}-700`,
    textActive: `text-${colors.name}-600`,
    border: `border-${colors.name}-600`,
    borderLeft: `border-l-2 border-${colors.name}-600`,
    button: `bg-${colors.name}-600 hover:bg-${colors.name}-700`,
    icon: `text-${colors.name}-600`,
  }
}

/**
 * Standard spacing values
 */
export const SPACING = {
  containerPadding: 'px-6 py-4',
  sectionGap: 'gap-4',
  cardPadding: 'p-6',
  cardRadius: 'rounded-2xl',
} as const

/**
 * Standard typography classes
 */
export const TYPOGRAPHY = {
  h1: 'text-2xl font-semibold text-gray-900',
  h2: 'text-xl font-semibold text-gray-800',
  h3: 'text-lg font-medium text-gray-700',
  body: 'text-sm text-gray-600 leading-relaxed',
  label: 'text-xs uppercase tracking-wide text-gray-500 font-medium',
  tableHeader: 'text-xs uppercase tracking-wide text-gray-600 font-semibold',
  tableCell: 'text-xs text-gray-700',
} as const

/**
 * Standard button classes
 */
export const BUTTONS = {
  primary: 'px-4 py-2 rounded-xl font-medium transition-all duration-150 ease-in-out',
  secondary: 'px-4 py-2 rounded-xl font-medium bg-gray-100 hover:bg-gray-200 transition-all duration-150 ease-in-out',
  outline: 'px-4 py-2 rounded-xl font-medium border-2 border-gray-300 hover:border-gray-400 transition-all duration-150 ease-in-out',
} as const

/**
 * Standard table classes
 */
export const TABLES = {
  container: 'max-h-[70vh] overflow-auto rounded-lg border border-gray-200',
  header: 'sticky top-0 bg-gray-50 z-10',
  headerRow: 'border-b border-gray-200 bg-gray-50',
  headerCell: 'py-2 px-3 text-xs uppercase tracking-wide text-gray-600 font-semibold',
  bodyRow: 'border-b border-gray-200 hover:bg-gray-50 transition-all duration-150 ease-in-out',
  bodyCell: 'py-2 px-3 text-xs text-gray-700',
} as const

/**
 * Standard card classes
 */
export const CARDS = {
  base: 'bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-200 border border-gray-200',
  header: 'p-6 border-b border-gray-200',
  content: 'p-6',
} as const

