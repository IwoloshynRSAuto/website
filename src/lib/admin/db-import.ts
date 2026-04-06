import { Prisma, QuoteStatus } from '@prisma/client'
import type { DbExportPayload } from '@/lib/admin/db-export'

export type ImportSnapshotResult = {
  counts: {
    users: number
    customers: number
    laborCodes: number
    quotes: number
    jobs: number
    timesheetSubmissions: number
    timeEntries: number
  }
}

function asRecord(row: unknown, label: string): Record<string, unknown> {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    throw new Error(`Invalid row in ${label}: expected object`)
  }
  return row as Record<string, unknown>
}

function str(r: Record<string, unknown>, k: string): string | undefined {
  const v = r[k]
  if (v == null) return undefined
  if (typeof v === 'string') return v
  return String(v)
}

function strReq(r: Record<string, unknown>, k: string, label: string): string {
  const s = str(r, k)
  if (s == null || s === '') throw new Error(`${label}: missing ${k}`)
  return s
}

function numOpt(r: Record<string, unknown>, k: string): number | undefined {
  const v = r[k]
  if (v == null) return undefined
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  if (typeof v === 'string') {
    const n = parseFloat(v)
    if (!Number.isNaN(n)) return n
  }
  return undefined
}

function numReq(r: Record<string, unknown>, k: string, label: string): number {
  const n = numOpt(r, k)
  if (n === undefined) throw new Error(`${label}: missing or invalid ${k}`)
  return n
}

function boolOpt(r: Record<string, unknown>, k: string): boolean | undefined {
  const v = r[k]
  if (typeof v === 'boolean') return v
  return undefined
}

function dateOpt(r: Record<string, unknown>, k: string): Date | undefined {
  const v = r[k]
  if (v == null) return undefined
  if (v instanceof Date) return v
  if (typeof v === 'string') {
    const d = new Date(v)
    if (!Number.isNaN(d.getTime())) return d
  }
  return undefined
}

function dateReq(r: Record<string, unknown>, k: string, label: string): Date {
  const d = dateOpt(r, k)
  if (!d) throw new Error(`${label}: missing or invalid ${k}`)
  return d
}

function decOpt(r: Record<string, unknown>, k: string): Prisma.Decimal | null | undefined {
  const v = r[k]
  if (v === null) return null
  if (v === undefined) return undefined
  try {
    return new Prisma.Decimal(String(v))
  } catch {
    return undefined
  }
}

function parseQuoteStatus(v: unknown): QuoteStatus {
  const s = typeof v === 'string' ? v : ''
  const allowed = Object.values(QuoteStatus) as string[]
  if (allowed.includes(s)) return s as QuoteStatus
  return QuoteStatus.DRAFT
}

/**
 * Merge snapshot into the database by primary key (upsert). Preserves IDs from the export.
 * Order respects FKs: users → customers → laborCodes → quotes → jobs → timesheet submissions → time entries.
 */
export async function importDatabaseSnapshot(
  prisma: Prisma.TransactionClient,
  payload: DbExportPayload
): Promise<ImportSnapshotResult> {
  const users = payload.users.map((row, i) => asRecord(row, `users[${i}]`))
  const customers = payload.customers.map((row, i) => asRecord(row, `customers[${i}]`))
  const laborCodes = payload.laborCodes.map((row, i) => asRecord(row, `laborCodes[${i}]`))
  const quotes = payload.quotes.map((row, i) => asRecord(row, `quotes[${i}]`))
  const jobs = payload.jobs.map((row, i) => asRecord(row, `jobs[${i}]`))
  const timesheetSubmissions = payload.timesheetSubmissions.map((row, i) =>
    asRecord(row, `timesheetSubmissions[${i}]`)
  )
  const timeEntries = payload.timeEntries.map((row, i) => asRecord(row, `timeEntries[${i}]`))

  // --- Users: two passes for managerId self-FK ---
  for (const r of users) {
    const id = strReq(r, 'id', 'user')
    const base = {
      email: strReq(r, 'email', `user ${id}`),
      name: str(r, 'name') ?? null,
      role: str(r, 'role') ?? 'USER',
      isActive: boolOpt(r, 'isActive') ?? true,
      position: str(r, 'position') ?? null,
      wage: decOpt(r, 'wage') ?? null,
      phone: str(r, 'phone') ?? null,
      createdAt: dateOpt(r, 'createdAt') ?? new Date(),
      updatedAt: dateOpt(r, 'updatedAt') ?? new Date(),
    }
    await prisma.user.upsert({
      where: { id },
      create: { id, ...base, managerId: null },
      update: { ...base, managerId: null },
    })
  }
  for (const r of users) {
    const id = strReq(r, 'id', 'user')
    const managerId = str(r, 'managerId') ?? null
    await prisma.user.update({
      where: { id },
      data: { managerId },
    })
  }

  for (const r of customers) {
    const id = strReq(r, 'id', 'customer')
    await prisma.customer.upsert({
      where: { id },
      create: {
        id,
        name: strReq(r, 'name', `customer ${id}`),
        email: str(r, 'email') ?? null,
        phone: str(r, 'phone') ?? null,
        address: str(r, 'address') ?? null,
        isActive: boolOpt(r, 'isActive') ?? true,
        fileLink: str(r, 'fileLink') ?? null,
        createdAt: dateOpt(r, 'createdAt') ?? new Date(),
        updatedAt: dateOpt(r, 'updatedAt') ?? new Date(),
      },
      update: {
        name: strReq(r, 'name', `customer ${id}`),
        email: str(r, 'email') ?? null,
        phone: str(r, 'phone') ?? null,
        address: str(r, 'address') ?? null,
        isActive: boolOpt(r, 'isActive') ?? true,
        fileLink: str(r, 'fileLink') ?? null,
        createdAt: dateOpt(r, 'createdAt') ?? new Date(),
        updatedAt: dateOpt(r, 'updatedAt') ?? new Date(),
      },
    })
  }

  for (const r of laborCodes) {
    const id = strReq(r, 'id', 'laborCode')
    const hourly = decOpt(r, 'hourlyRate')
    await prisma.laborCode.upsert({
      where: { id },
      create: {
        id,
        code: strReq(r, 'code', `laborCode ${id}`),
        name: strReq(r, 'name', `laborCode ${id}`),
        description: str(r, 'description') ?? null,
        category: strReq(r, 'category', `laborCode ${id}`),
        hourlyRate: hourly ?? new Prisma.Decimal(0),
        isActive: boolOpt(r, 'isActive') ?? true,
        createdAt: dateOpt(r, 'createdAt') ?? new Date(),
        updatedAt: dateOpt(r, 'updatedAt') ?? new Date(),
      },
      update: {
        code: strReq(r, 'code', `laborCode ${id}`),
        name: strReq(r, 'name', `laborCode ${id}`),
        description: str(r, 'description') ?? null,
        category: strReq(r, 'category', `laborCode ${id}`),
        hourlyRate: hourly ?? new Prisma.Decimal(0),
        isActive: boolOpt(r, 'isActive') ?? true,
        createdAt: dateOpt(r, 'createdAt') ?? new Date(),
        updatedAt: dateOpt(r, 'updatedAt') ?? new Date(),
      },
    })
  }

  for (const r of quotes) {
    const id = strReq(r, 'id', 'quote')
    await prisma.quote.upsert({
      where: { id },
      create: {
        id,
        quoteNumber: strReq(r, 'quoteNumber', `quote ${id}`),
        title: strReq(r, 'title', `quote ${id}`),
        description: str(r, 'description') ?? null,
        customerId: str(r, 'customerId') ?? null,
        assignedToId: str(r, 'assignedToId') ?? null,
        amount: numOpt(r, 'amount') ?? 0,
        validUntil: dateOpt(r, 'validUntil') ?? null,
        status: parseQuoteStatus(r.status),
        quoteType: str(r, 'quoteType') ?? 'PROJECT',
        isActive: boolOpt(r, 'isActive') ?? true,
        paymentTerms: str(r, 'paymentTerms') ?? null,
        estimatedHours: numOpt(r, 'estimatedHours') ?? null,
        hourlyRate: numOpt(r, 'hourlyRate') ?? null,
        laborCost: numOpt(r, 'laborCost') ?? null,
        materialCost: numOpt(r, 'materialCost') ?? null,
        overheadCost: numOpt(r, 'overheadCost') ?? null,
        profitMargin: numOpt(r, 'profitMargin') ?? null,
        customerContactName: str(r, 'customerContactName') ?? null,
        customerContactEmail: str(r, 'customerContactEmail') ?? null,
        customerContactPhone: str(r, 'customerContactPhone') ?? null,
        lastFollowUp: dateOpt(r, 'lastFollowUp') ?? null,
        quoteFile: str(r, 'quoteFile') ?? null,
        createdAt: dateOpt(r, 'createdAt') ?? new Date(),
        updatedAt: dateOpt(r, 'updatedAt') ?? new Date(),
      },
      update: {
        quoteNumber: strReq(r, 'quoteNumber', `quote ${id}`),
        title: strReq(r, 'title', `quote ${id}`),
        description: str(r, 'description') ?? null,
        customerId: str(r, 'customerId') ?? null,
        assignedToId: str(r, 'assignedToId') ?? null,
        amount: numOpt(r, 'amount') ?? 0,
        validUntil: dateOpt(r, 'validUntil') ?? null,
        status: parseQuoteStatus(r.status),
        quoteType: str(r, 'quoteType') ?? 'PROJECT',
        isActive: boolOpt(r, 'isActive') ?? true,
        paymentTerms: str(r, 'paymentTerms') ?? null,
        estimatedHours: numOpt(r, 'estimatedHours') ?? null,
        hourlyRate: numOpt(r, 'hourlyRate') ?? null,
        laborCost: numOpt(r, 'laborCost') ?? null,
        materialCost: numOpt(r, 'materialCost') ?? null,
        overheadCost: numOpt(r, 'overheadCost') ?? null,
        profitMargin: numOpt(r, 'profitMargin') ?? null,
        customerContactName: str(r, 'customerContactName') ?? null,
        customerContactEmail: str(r, 'customerContactEmail') ?? null,
        customerContactPhone: str(r, 'customerContactPhone') ?? null,
        lastFollowUp: dateOpt(r, 'lastFollowUp') ?? null,
        quoteFile: str(r, 'quoteFile') ?? null,
        createdAt: dateOpt(r, 'createdAt') ?? new Date(),
        updatedAt: dateOpt(r, 'updatedAt') ?? new Date(),
      },
    })
  }

  for (const r of jobs) {
    const id = strReq(r, 'id', 'job')
    const createdById = strReq(r, 'createdById', `job ${id}`)
    await prisma.job.upsert({
      where: { id },
      create: {
        id,
        jobNumber: strReq(r, 'jobNumber', `job ${id}`),
        title: strReq(r, 'title', `job ${id}`),
        description: str(r, 'description') ?? null,
        type: str(r, 'type') ?? 'JOB',
        status: str(r, 'status') ?? 'ACTIVE',
        createdFromQuoteId: str(r, 'createdFromQuoteId') ?? null,
        priority: str(r, 'priority') ?? 'MEDIUM',
        startDate: dateOpt(r, 'startDate') ?? null,
        endDate: dateOpt(r, 'endDate') ?? null,
        estimatedHours: numOpt(r, 'estimatedHours') ?? null,
        actualHours: numOpt(r, 'actualHours') ?? null,
        assignedToId: str(r, 'assignedToId') ?? null,
        createdById,
        customerId: str(r, 'customerId') ?? null,
        workCode: str(r, 'workCode') ?? null,
        estimatedCost: numOpt(r, 'estimatedCost') ?? null,
        dueTodayPercent: numOpt(r, 'dueTodayPercent') ?? null,
        inQuickBooks: boolOpt(r, 'inQuickBooks') ?? false,
        inLDrive: boolOpt(r, 'inLDrive') ?? false,
        fileLink: str(r, 'fileLink') ?? null,
        quoteId: str(r, 'quoteId') ?? null,
        relatedQuoteId: str(r, 'relatedQuoteId') ?? null,
        convertedAt: dateOpt(r, 'convertedAt') ?? null,
        lockedHours: numOpt(r, 'lockedHours') ?? null,
        currentRevision: str(r, 'currentRevision') ?? null,
        lastFollowUp: dateOpt(r, 'lastFollowUp') ?? null,
        createdAt: dateOpt(r, 'createdAt') ?? new Date(),
        updatedAt: dateOpt(r, 'updatedAt') ?? new Date(),
      },
      update: {
        jobNumber: strReq(r, 'jobNumber', `job ${id}`),
        title: strReq(r, 'title', `job ${id}`),
        description: str(r, 'description') ?? null,
        type: str(r, 'type') ?? 'JOB',
        status: str(r, 'status') ?? 'ACTIVE',
        createdFromQuoteId: str(r, 'createdFromQuoteId') ?? null,
        priority: str(r, 'priority') ?? 'MEDIUM',
        startDate: dateOpt(r, 'startDate') ?? null,
        endDate: dateOpt(r, 'endDate') ?? null,
        estimatedHours: numOpt(r, 'estimatedHours') ?? null,
        actualHours: numOpt(r, 'actualHours') ?? null,
        assignedToId: str(r, 'assignedToId') ?? null,
        createdById,
        customerId: str(r, 'customerId') ?? null,
        workCode: str(r, 'workCode') ?? null,
        estimatedCost: numOpt(r, 'estimatedCost') ?? null,
        dueTodayPercent: numOpt(r, 'dueTodayPercent') ?? null,
        inQuickBooks: boolOpt(r, 'inQuickBooks') ?? false,
        inLDrive: boolOpt(r, 'inLDrive') ?? false,
        fileLink: str(r, 'fileLink') ?? null,
        quoteId: str(r, 'quoteId') ?? null,
        relatedQuoteId: str(r, 'relatedQuoteId') ?? null,
        convertedAt: dateOpt(r, 'convertedAt') ?? null,
        lockedHours: numOpt(r, 'lockedHours') ?? null,
        currentRevision: str(r, 'currentRevision') ?? null,
        lastFollowUp: dateOpt(r, 'lastFollowUp') ?? null,
        createdAt: dateOpt(r, 'createdAt') ?? new Date(),
        updatedAt: dateOpt(r, 'updatedAt') ?? new Date(),
      },
    })
  }

  for (const r of timesheetSubmissions) {
    const id = strReq(r, 'id', 'timesheetSubmission')
    await prisma.timesheetSubmission.upsert({
      where: { id },
      create: {
        id,
        userId: strReq(r, 'userId', `timesheetSubmission ${id}`),
        weekStart: dateReq(r, 'weekStart', `timesheetSubmission ${id}`),
        weekEnd: dateReq(r, 'weekEnd', `timesheetSubmission ${id}`),
        type: str(r, 'type') ?? 'TIME',
        status: str(r, 'status') ?? 'DRAFT',
        submittedAt: dateOpt(r, 'submittedAt') ?? null,
        approvedAt: dateOpt(r, 'approvedAt') ?? null,
        approvedById: str(r, 'approvedById') ?? null,
        rejectedAt: dateOpt(r, 'rejectedAt') ?? null,
        rejectedById: str(r, 'rejectedById') ?? null,
        rejectionReason: str(r, 'rejectionReason') ?? null,
        createdAt: dateOpt(r, 'createdAt') ?? new Date(),
        updatedAt: dateOpt(r, 'updatedAt') ?? new Date(),
      },
      update: {
        userId: strReq(r, 'userId', `timesheetSubmission ${id}`),
        weekStart: dateReq(r, 'weekStart', `timesheetSubmission ${id}`),
        weekEnd: dateReq(r, 'weekEnd', `timesheetSubmission ${id}`),
        type: str(r, 'type') ?? 'TIME',
        status: str(r, 'status') ?? 'DRAFT',
        submittedAt: dateOpt(r, 'submittedAt') ?? null,
        approvedAt: dateOpt(r, 'approvedAt') ?? null,
        approvedById: str(r, 'approvedById') ?? null,
        rejectedAt: dateOpt(r, 'rejectedAt') ?? null,
        rejectedById: str(r, 'rejectedById') ?? null,
        rejectionReason: str(r, 'rejectionReason') ?? null,
        createdAt: dateOpt(r, 'createdAt') ?? new Date(),
        updatedAt: dateOpt(r, 'updatedAt') ?? new Date(),
      },
    })
  }

  for (const r of timeEntries) {
    const id = strReq(r, 'id', 'timeEntry')
    const jobId = strReq(r, 'jobId', `timeEntry ${id}`)
    await prisma.timeEntry.upsert({
      where: { id },
      create: {
        id,
        date: dateReq(r, 'date', `timeEntry ${id}`),
        regularHours: numOpt(r, 'regularHours') ?? 0,
        overtimeHours: numOpt(r, 'overtimeHours') ?? 0,
        notes: str(r, 'notes') ?? null,
        billable: boolOpt(r, 'billable') ?? true,
        rate: decOpt(r, 'rate') ?? null,
        userId: str(r, 'userId') ?? null,
        jobId,
        laborCodeId: str(r, 'laborCodeId') ?? null,
        submissionId: str(r, 'submissionId') ?? null,
        createdAt: dateOpt(r, 'createdAt') ?? new Date(),
        updatedAt: dateOpt(r, 'updatedAt') ?? new Date(),
      },
      update: {
        date: dateReq(r, 'date', `timeEntry ${id}`),
        regularHours: numOpt(r, 'regularHours') ?? 0,
        overtimeHours: numOpt(r, 'overtimeHours') ?? 0,
        notes: str(r, 'notes') ?? null,
        billable: boolOpt(r, 'billable') ?? true,
        rate: decOpt(r, 'rate') ?? null,
        userId: str(r, 'userId') ?? null,
        jobId,
        laborCodeId: str(r, 'laborCodeId') ?? null,
        submissionId: str(r, 'submissionId') ?? null,
        createdAt: dateOpt(r, 'createdAt') ?? new Date(),
        updatedAt: dateOpt(r, 'updatedAt') ?? new Date(),
      },
    })
  }

  return {
    counts: {
      users: users.length,
      customers: customers.length,
      laborCodes: laborCodes.length,
      quotes: quotes.length,
      jobs: jobs.length,
      timesheetSubmissions: timesheetSubmissions.length,
      timeEntries: timeEntries.length,
    },
  }
}
