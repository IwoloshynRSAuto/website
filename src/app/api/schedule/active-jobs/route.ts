import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Active jobs portfolio for schedule Gantt: bars from startDate → endDate,
 * quoted vs actual hours, deliverable due markers.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const fromQ = searchParams.get('from')
  const toQ = searchParams.get('to')
  const from = fromQ ? new Date(fromQ) : new Date()
  const to = toQ ? new Date(toQ) : new Date(from.getTime() + 90 * 86_400_000)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return NextResponse.json({ success: false, error: 'Invalid from/to' }, { status: 400 })
  }

  const jobs = await prisma.job.findMany({
    where: {
      type: 'JOB',
      status: 'ACTIVE',
    },
    select: {
      id: true,
      jobNumber: true,
      title: true,
      startDate: true,
      endDate: true,
      createdAt: true,
      quotedLabor: { select: { estimatedHours: true } },
      deliverables: {
        where: { dueDate: { not: null } },
        select: { id: true, name: true, dueDate: true, status: true },
      },
    },
    orderBy: [{ jobNumber: 'asc' }],
    take: 500,
  })

  const jobIds = jobs.map((j) => j.id)
  const sums =
    jobIds.length === 0
      ? []
      : await prisma.timeEntry.groupBy({
          by: ['jobId'],
          where: { jobId: { in: jobIds } },
          _sum: { regularHours: true, overtimeHours: true },
        })
  const actualByJob = new Map<string, number>()
  for (const row of sums) {
    const r = Number(row._sum.regularHours) || 0
    const o = Number(row._sum.overtimeHours) || 0
    actualByJob.set(row.jobId, r + o)
  }

  const DAY = 86_400_000
  const data = jobs.map((j) => {
    const quoted = j.quotedLabor.reduce((s, q) => s + (Number(q.estimatedHours) || 0), 0)
    const actual = actualByJob.get(j.id) ?? 0
    const startMs = j.startDate ? j.startDate.getTime() : j.createdAt.getTime()
    let endMs = j.endDate ? j.endDate.getTime() : startMs + 14 * DAY
    if (endMs <= startMs) endMs = startMs + DAY
    return {
      id: j.id,
      jobNumber: j.jobNumber,
      title: j.title,
      startDate: new Date(startMs).toISOString(),
      endDate: new Date(endMs).toISOString(),
      quotedHours: quoted,
      actualHours: actual,
      hoursRemaining: Math.max(0, quoted - actual),
      deliverables: j.deliverables.map((d) => ({
        id: d.id,
        name: d.name,
        dueDate: d.dueDate!.toISOString(),
        status: d.status,
      })),
    }
  })

  return NextResponse.json({ success: true, data: { from: from.toISOString(), to: to.toISOString(), jobs: data } })
}
