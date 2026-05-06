import { prisma } from '@/lib/prisma'

export type UpcomingJobDeadline = {
  id: string
  jobNumber: string
  title: string
  endDate: Date | null
  customerName: string | null
  overdue: boolean
}

/** Active jobs with nearest end dates first; overdue ends listed before upcoming; missing dates last. */
export async function getUpcomingJobDeadlines(limit = 8): Promise<UpcomingJobDeadline[]> {
  const jobs = await prisma.job.findMany({
    where: { status: { not: 'COMPLETED' } },
    select: {
      id: true,
      jobNumber: true,
      title: true,
      endDate: true,
      customer: { select: { name: true } },
    },
  })
  const now = Date.now()
  type Row = UpcomingJobDeadline & { _sort: number }
  const rows: Row[] = jobs.map((j) => {
    const end = j.endDate
    const overdue = !!(end && end.getTime() < now)
    let sort = 0
    if (!end) sort = Number.POSITIVE_INFINITY
    else sort = end.getTime()
    return {
      id: j.id,
      jobNumber: j.jobNumber,
      title: j.title,
      endDate: end,
      customerName: j.customer?.name ?? null,
      overdue,
      _sort: sort,
    }
  })
  rows.sort((a, b) => {
    const aMissing = !a.endDate
    const bMissing = !b.endDate
    if (aMissing && bMissing) return a.jobNumber.localeCompare(b.jobNumber)
    if (aMissing) return 1
    if (bMissing) return -1
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1
    return a._sort - b._sort
  })
  return rows.slice(0, limit).map(({ id, jobNumber, title, endDate, customerName, overdue }) => ({
    id,
    jobNumber,
    title,
    endDate,
    customerName,
    overdue,
  }))
}

function startOfYear(d = new Date()) {
  return new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0)
}

export type VendorSpendRow = { vendorId: string; vendorName: string; orderCount: number; totalSpend: number }

export async function getVendorSpendYtd(): Promise<VendorSpendRow[]> {
  const from = startOfYear()
  const grouped = await prisma.purchaseOrder.groupBy({
    by: ['vendorId'],
    where: {
      orderDate: { gte: from },
      status: { not: 'CANCELLED' },
    },
    _count: { id: true },
    _sum: { totalAmount: true },
  })
  const vendorIds = grouped.map((g) => g.vendorId)
  if (vendorIds.length === 0) return []
  const vendors = await prisma.vendor.findMany({
    where: { id: { in: vendorIds } },
    select: { id: true, name: true },
  })
  const nameById = new Map(vendors.map((v) => [v.id, v.name]))
  return grouped
    .map((g) => ({
      vendorId: g.vendorId,
      vendorName: nameById.get(g.vendorId) || g.vendorId,
      orderCount: g._count.id,
      totalSpend: Number(g._sum.totalAmount || 0),
    }))
    .sort((a, b) => b.totalSpend - a.totalSpend)
}

export type CustomerHoursRow = { customerId: string; customerName: string; totalHours: number }

export async function getCustomerBillableHoursYtd(): Promise<CustomerHoursRow[]> {
  const from = startOfYear()
  const entries = await prisma.timeEntry.findMany({
    where: {
      date: { gte: from },
      billable: true,
    },
    select: {
      regularHours: true,
      overtimeHours: true,
      job: {
        select: {
          customerId: true,
          customer: { select: { id: true, name: true } },
        },
      },
    },
  })
  const map = new Map<string, CustomerHoursRow>()
  for (const e of entries) {
    const cid = e.job.customerId
    if (!cid || !e.job.customer) continue
    const h = (Number(e.regularHours) || 0) + (Number(e.overtimeHours) || 0)
    const prev = map.get(cid)
    if (prev) prev.totalHours += h
    else map.set(cid, { customerId: cid, customerName: e.job.customer.name, totalHours: h })
  }
  return [...map.values()].sort((a, b) => b.totalHours - a.totalHours)
}

export type CustomerPaidRow = { customerId: string; customerName: string; paidTotal: number }

export type MonthlyHoursPoint = { monthIndex: number; label: string; hours: number }

/** Billable hours aggregated by calendar month from Jan through current month (YTD). */
export async function getMonthlyBillableHoursYtd(): Promise<MonthlyHoursPoint[]> {
  const from = startOfYear()
  const now = new Date()
  const entries = await prisma.timeEntry.findMany({
    where: {
      date: { gte: from },
      billable: true,
    },
    select: {
      date: true,
      regularHours: true,
      overtimeHours: true,
    },
  })
  const monthTotals = new Map<number, number>()
  for (const e of entries) {
    const mi = e.date.getMonth()
    const h = (Number(e.regularHours) || 0) + (Number(e.overtimeHours) || 0)
    monthTotals.set(mi, (monthTotals.get(mi) || 0) + h)
  }
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const curMonth = now.getMonth()
  const year = now.getFullYear()
  const out: MonthlyHoursPoint[] = []
  for (let i = 0; i <= curMonth; i++) {
    out.push({
      monthIndex: i,
      label: `${labels[i]} ${year}`,
      hours: Math.round((monthTotals.get(i) || 0) * 10) / 10,
    })
  }
  return out
}

export async function getCustomerPaidInvoicingYtd(): Promise<CustomerPaidRow[]> {
  const from = startOfYear()
  const milestones = await prisma.billingMilestone.findMany({
    where: {
      status: 'PAID',
      updatedAt: { gte: from },
    },
    select: {
      amount: true,
      job: {
        select: {
          customerId: true,
          customer: { select: { id: true, name: true } },
        },
      },
    },
  })
  const map = new Map<string, CustomerPaidRow>()
  for (const m of milestones) {
    const cid = m.job.customerId
    if (!cid || !m.job.customer) continue
    const amt = Number(m.amount) || 0
    const prev = map.get(cid)
    if (prev) prev.paidTotal += amt
    else map.set(cid, { customerId: cid, customerName: m.job.customer.name, paidTotal: amt })
  }
  return [...map.values()].sort((a, b) => b.paidTotal - a.paidTotal)
}
