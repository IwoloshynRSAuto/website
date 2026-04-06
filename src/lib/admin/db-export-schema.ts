/** Shared validation for portal JSON exports (no Prisma — safe for client + server). */

import type { DbExportPayload } from '@/lib/admin/db-export'

export function isDbExportShape(raw: unknown): raw is {
  users: unknown[]
  customers: unknown[]
  jobs: unknown[]
  laborCodes: unknown[]
  timeEntries: unknown[]
  timesheetSubmissions: unknown[]
  quotes?: unknown[]
  exportDate?: unknown
} {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false
  const o = raw as Record<string, unknown>
  const keys = ['users', 'customers', 'jobs', 'laborCodes', 'timeEntries', 'timesheetSubmissions'] as const
  for (const k of keys) {
    if (!Array.isArray(o[k])) return false
  }
  return true
}

export function summarizeExportCounts(raw: unknown): Record<string, number> | null {
  if (!isDbExportShape(raw)) return null
  const o = raw as Record<string, unknown>
  return {
    users: o.users.length,
    customers: o.customers.length,
    jobs: o.jobs.length,
    quotes: Array.isArray(o.quotes) ? o.quotes.length : 0,
    laborCodes: o.laborCodes.length,
    timeEntries: o.timeEntries.length,
    timesheetSubmissions: o.timesheetSubmissions.length,
  }
}

export function parseDbExportPayload(raw: unknown): DbExportPayload {
  if (!isDbExportShape(raw)) {
    throw new Error(
      'Invalid JSON: expected an object with users, customers, jobs, laborCodes, timeEntries, and timesheetSubmissions arrays'
    )
  }
  const o = raw as Record<string, unknown>
  const quotes = o.quotes
  return {
    users: o.users as unknown[],
    customers: o.customers as unknown[],
    jobs: o.jobs as unknown[],
    quotes: Array.isArray(quotes) ? (quotes as unknown[]) : [],
    laborCodes: o.laborCodes as unknown[],
    timeEntries: o.timeEntries as unknown[],
    timesheetSubmissions: o.timesheetSubmissions as unknown[],
    exportDate: typeof o.exportDate === 'string' ? o.exportDate : new Date().toISOString(),
  }
}
