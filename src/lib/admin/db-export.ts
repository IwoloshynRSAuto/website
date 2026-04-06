import { prisma } from '@/lib/prisma'

/** Recursively stringify Prisma Decimal / Date / BigInt for JSON + Excel cells */
export function serializeValue(value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'bigint') return value.toString()
  if (Array.isArray(value)) return value.map(serializeValue)
  if (typeof value === 'object') {
    const ctor = (value as { constructor?: { name?: string } }).constructor?.name
    if (ctor === 'Decimal' || typeof (value as { toFixed?: (n: number) => string }).toFixed === 'function') {
      return String(value)
    }
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = serializeValue(v)
    }
    return out
  }
  return value
}

/** Same top-level shape as `scripts/export-data.js`, plus `quotes`. */
export type DbExportPayload = {
  users: unknown[]
  customers: unknown[]
  jobs: unknown[]
  quotes: unknown[]
  laborCodes: unknown[]
  timeEntries: unknown[]
  timesheetSubmissions: unknown[]
  exportDate: string
}

/**
 * Snapshot of core tables for backup / migration. Expand as needed.
 */
export async function buildDatabaseExportPayload(): Promise<DbExportPayload> {
  const [
    users,
    customers,
    jobs,
    quotes,
    laborCodes,
    timeEntries,
    timesheetSubmissions,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.customer.findMany(),
    prisma.job.findMany(),
    prisma.quote.findMany(),
    prisma.laborCode.findMany(),
    prisma.timeEntry.findMany(),
    prisma.timesheetSubmission.findMany(),
  ])

  return {
    users: users.map((r) => serializeValue(r)) as unknown[],
    customers: customers.map((r) => serializeValue(r)) as unknown[],
    jobs: jobs.map((r) => serializeValue(r)) as unknown[],
    quotes: quotes.map((r) => serializeValue(r)) as unknown[],
    laborCodes: laborCodes.map((r) => serializeValue(r)) as unknown[],
    timeEntries: timeEntries.map((r) => serializeValue(r)) as unknown[],
    timesheetSubmissions: timesheetSubmissions.map((r) => serializeValue(r)) as unknown[],
    exportDate: new Date().toISOString(),
  }
}

function rowsToSheetData(rows: unknown[]): { headers: string[]; cells: (string | number | boolean)[][] } {
  const keySet = new Set<string>()
  for (const row of rows) {
    if (row && typeof row === 'object' && !Array.isArray(row)) {
      for (const k of Object.keys(row as Record<string, unknown>)) {
        keySet.add(k)
      }
    }
  }
  const headers = Array.from(keySet).sort((a, b) => a.localeCompare(b))
  const cells = rows.map((row) => {
    const obj = (row && typeof row === 'object' && !Array.isArray(row) ? row : {}) as Record<string, unknown>
    return headers.map((h) => {
      const v = obj[h]
      if (v === null || v === undefined) return ''
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v
      return JSON.stringify(v)
    })
  })
  return { headers, cells }
}

export async function buildDatabaseExportWorkbookBuffer(): Promise<Buffer> {
  const ExcelJS = (await import('exceljs')).default
  const payload = await buildDatabaseExportPayload()
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'RS Automation Portal'
  workbook.created = new Date()

  const sheets: Array<{ name: string; rows: unknown[] }> = [
    { name: 'Users', rows: payload.users },
    { name: 'Customers', rows: payload.customers },
    { name: 'Jobs', rows: payload.jobs },
    { name: 'Quotes', rows: payload.quotes },
    { name: 'LaborCodes', rows: payload.laborCodes },
    { name: 'TimeEntries', rows: payload.timeEntries },
    { name: 'TimesheetSubmissions', rows: payload.timesheetSubmissions },
  ]

  for (const { name, rows } of sheets) {
    const ws = workbook.addWorksheet(name.slice(0, 31))
    const { headers, cells } = rowsToSheetData(rows)
    ws.addRow(headers)
    for (const line of cells) {
      ws.addRow(line)
    }
    ws.getRow(1).font = { bold: true }
  }

  const buf = await workbook.xlsx.writeBuffer()
  return Buffer.from(buf)
}
