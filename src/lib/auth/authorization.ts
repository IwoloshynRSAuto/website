/**
 * Centralized authorization module
 * Role-based access control with capability mapping
 */

export type Role =
  | 'ADMIN'
  | 'PROJECT_MANAGER'
  | 'ENGINEER'
  | 'TECHNICIAN'
  | 'SALES'
  | 'ACCOUNTING'
  | 'CLIENT_PORTAL'
  | 'USER' // Legacy role (maps to TECHNICIAN)
  | 'MANAGER' // Legacy role (maps to PROJECT_MANAGER)

export type Action =
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'submit'
  | 'export'
  | 'manage_users'
  | 'manage_roles'
  | 'view_analytics'
  | 'manage_vendors'
  | 'manage_customers'

export type Resource =
  | 'timesheet'
  | 'timesheet_submission'
  | 'time_entry'
  | 'time_off_request'
  | 'expense_report'
  | 'service_report'
  | 'job'
  | 'quote'
  | 'part_sale'
  | 'vendor'
  | 'customer'
  | 'purchase_order'
  | 'user'
  | 'analytics'
  | 'bom'
  | 'part'

export interface User {
  id: string
  role: Role
  email?: string
  name?: string
}

/**
 * Role capability map
 * Defines what each role can do
 */
const roleCapabilities: Record<Role, Record<Resource, Action[]>> = {
  ADMIN: {
    timesheet: ['read', 'create', 'update', 'delete', 'approve', 'reject'],
    timesheet_submission: ['read', 'create', 'update', 'delete', 'approve', 'reject'],
    time_entry: ['read', 'create', 'update', 'delete'],
    time_off_request: ['read', 'create', 'update', 'delete', 'approve', 'reject'],
    expense_report: ['read', 'create', 'update', 'delete', 'approve', 'reject'],
    service_report: ['read', 'create', 'update', 'delete'],
    job: ['read', 'create', 'update', 'delete', 'export'],
    quote: ['read', 'create', 'update', 'delete', 'export', 'approve'],
    part_sale: ['read', 'create', 'update', 'delete', 'export'],
    vendor: ['read', 'create', 'update', 'delete'],
    customer: ['read', 'create', 'update', 'delete'],
    purchase_order: ['read', 'create', 'update', 'delete', 'approve'],
    user: ['read', 'create', 'update', 'delete', 'manage_roles'],
    analytics: ['read', 'view_analytics'],
    bom: ['read', 'create', 'update', 'delete'],
    part: ['read', 'create', 'update', 'delete'],
  },
  PROJECT_MANAGER: {
    timesheet: ['read', 'approve', 'reject'],
    timesheet_submission: ['read', 'approve', 'reject'],
    time_entry: ['read'],
    time_off_request: ['read', 'create', 'update', 'approve', 'reject'],
    expense_report: ['read', 'create', 'update', 'approve', 'reject'],
    service_report: ['read', 'create', 'update', 'delete'],
    job: ['read', 'create', 'update', 'export'],
    quote: ['read', 'create', 'update', 'export'],
    part_sale: ['read', 'create', 'update', 'export'],
    vendor: ['read', 'create', 'update'],
    customer: ['read', 'create', 'update'],
    purchase_order: ['read', 'create', 'update', 'approve'],
    user: ['read'],
    analytics: ['read', 'view_analytics'],
    bom: ['read', 'create', 'update'],
    part: ['read', 'create', 'update'],
  },
  ENGINEER: {
    timesheet: ['read', 'create', 'update', 'submit'],
    timesheet_submission: ['read', 'create', 'update', 'submit'],
    time_entry: ['read', 'create', 'update'],
    time_off_request: ['read', 'create', 'update'],
    expense_report: ['read', 'create', 'update', 'submit'],
    service_report: ['read', 'create', 'update'],
    job: ['read', 'create', 'update'],
    quote: ['read', 'create', 'update', 'export'],
    part_sale: ['read', 'create', 'update', 'export'],
    vendor: ['read'],
    customer: ['read'],
    purchase_order: ['read', 'create'],
    user: ['read'],
    analytics: ['read'],
    bom: ['read', 'create', 'update'],
    part: ['read', 'create', 'update'],
  },
  TECHNICIAN: {
    timesheet: ['read', 'create', 'update', 'submit'],
    timesheet_submission: ['read', 'create', 'update', 'submit'],
    time_entry: ['read', 'create', 'update'],
    time_off_request: ['read', 'create', 'update'],
    expense_report: ['read', 'create', 'update', 'submit'],
    service_report: ['read', 'create', 'update'],
    job: ['read', 'update'],
    quote: ['read'],
    part_sale: ['read'],
    vendor: ['read'],
    customer: ['read'],
    purchase_order: ['read'],
    user: ['read'],
    analytics: [],
    bom: ['read'],
    part: ['read'],
  },
  SALES: {
    timesheet: ['read'],
    timesheet_submission: ['read'],
    time_entry: ['read'],
    time_off_request: ['read', 'create', 'update'],
    expense_report: ['read', 'create', 'update', 'submit'],
    service_report: ['read'],
    job: ['read'],
    quote: ['read', 'create', 'update', 'export'],
    part_sale: ['read', 'create', 'update', 'export'],
    vendor: ['read', 'create', 'update'],
    customer: ['read', 'create', 'update'],
    purchase_order: ['read'],
    user: ['read'],
    analytics: ['read', 'view_analytics'],
    bom: ['read', 'create', 'update'],
    part: ['read'],
  },
  ACCOUNTING: {
    timesheet: ['read'],
    timesheet_submission: ['read', 'approve', 'reject'],
    time_entry: ['read'],
    time_off_request: ['read', 'approve', 'reject'],
    expense_report: ['read', 'create', 'update', 'approve', 'reject'],
    service_report: ['read'],
    job: ['read'],
    quote: ['read'],
    part_sale: ['read'],
    vendor: ['read', 'create', 'update'],
    customer: ['read', 'create', 'update'],
    purchase_order: ['read', 'create', 'update', 'approve'],
    user: ['read'],
    analytics: ['read', 'view_analytics'],
    bom: ['read'],
    part: ['read'],
  },
  CLIENT_PORTAL: {
    timesheet: [],
    timesheet_submission: [],
    time_entry: [],
    time_off_request: [],
    expense_report: [],
    service_report: [],
    job: ['read'], // Limited to their own jobs
    quote: ['read'], // Limited to their own quotes
    part_sale: ['read'], // Limited to their own part sales
    vendor: [],
    customer: ['read'], // Limited to their own customer record
    purchase_order: [],
    user: [],
    analytics: [],
    bom: [],
    part: [],
  },
  USER: {
    // Legacy role - maps to TECHNICIAN capabilities
    timesheet: ['read', 'create', 'update', 'submit'],
    timesheet_submission: ['read', 'create', 'update', 'submit'],
    time_entry: ['read', 'create', 'update'],
    time_off_request: ['read', 'create', 'update'],
    expense_report: ['read', 'create', 'update', 'submit'],
    service_report: ['read', 'create', 'update'],
    job: ['read', 'update'],
    quote: ['read'],
    part_sale: ['read'],
    vendor: ['read'],
    customer: ['read'],
    purchase_order: ['read'],
    user: ['read'],
    analytics: [],
    bom: ['read'],
    part: ['read'],
  },
  MANAGER: {
    // Legacy role - maps to PROJECT_MANAGER capabilities
    timesheet: ['read', 'approve', 'reject'],
    timesheet_submission: ['read', 'approve', 'reject'],
    time_entry: ['read'],
    time_off_request: ['read', 'create', 'update', 'approve', 'reject'],
    expense_report: ['read', 'create', 'update', 'approve', 'reject'],
    service_report: ['read', 'create', 'update', 'delete'],
    job: ['read', 'create', 'update', 'export'],
    quote: ['read', 'create', 'update', 'export'],
    part_sale: ['read', 'create', 'update', 'export'],
    vendor: ['read', 'create', 'update'],
    customer: ['read', 'create', 'update'],
    purchase_order: ['read', 'create', 'update', 'approve'],
    user: ['read'],
    analytics: ['read', 'view_analytics'],
    bom: ['read', 'create', 'update'],
    part: ['read', 'create', 'update'],
  },
}

/**
 * Check if a user can perform an action on a resource
 */
export function authorize(user: User | null | undefined, action: Action, resource: Resource): boolean {
  if (!user) {
    return false
  }

  // Normalize legacy roles
  const normalizedRole: Role = user.role === 'USER' ? 'TECHNICIAN' : user.role === 'MANAGER' ? 'PROJECT_MANAGER' : user.role

  const capabilities = roleCapabilities[normalizedRole]
  if (!capabilities) {
    return false
  }

  const resourceCapabilities = capabilities[resource]
  if (!resourceCapabilities) {
    return false
  }

  return resourceCapabilities.includes(action)
}

/**
 * Check if user can access their own resource
 * Users can always access their own resources (unless explicitly denied)
 */
export function authorizeOwnResource(
  user: User | null | undefined,
  action: Action,
  resource: Resource,
  resourceUserId?: string
): boolean {
  if (!user || !resourceUserId) {
    return authorize(user, action, resource)
  }

  // Users can always read/update their own resources
  if (user.id === resourceUserId && (action === 'read' || action === 'update' || action === 'create')) {
    return true
  }

  // For other actions, check role capabilities
  return authorize(user, action, resource)
}

/**
 * Get user's role capabilities for a resource
 */
export function getCapabilities(user: User | null | undefined, resource: Resource): Action[] {
  if (!user) {
    return []
  }

  const normalizedRole: Role = user.role === 'USER' ? 'TECHNICIAN' : user.role === 'MANAGER' ? 'PROJECT_MANAGER' : user.role

  const capabilities = roleCapabilities[normalizedRole]
  if (!capabilities) {
    return []
  }

  return capabilities[resource] || []
}

/**
 * Check if user has any capability for a resource
 */
export function hasAnyCapability(user: User | null | undefined, resource: Resource): boolean {
  return getCapabilities(user, resource).length > 0
}

/**
 * Check if user is admin
 */
export function isAdmin(user: User | null | undefined): boolean {
  return user?.role === 'ADMIN'
}

/**
 * Check if user is manager or above
 */
export function isManagerOrAbove(user: User | null | undefined): boolean {
  if (!user) return false
  const role = user.role
  return (
    role === 'ADMIN' ||
    role === 'PROJECT_MANAGER' ||
    role === 'MANAGER' ||
    role === 'ACCOUNTING' ||
    role === 'SALES'
  )
}

