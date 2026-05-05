import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Master schedule: segments overlapping [from, to] for JOB and QUOTE rows on the jobs board (quoted labor).
 * sort=project: grouped by jobId; sort=employee: grouped by employeeId (assignments only; unassigned listed separately).
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const fromS = searchParams.get('from')
  const toS = searchParams.get('to')
  const sort = searchParams.get('sort') === 'employee' ? 'employee' : 'project'

  if (!fromS || !toS) {
    return NextResponse.json({ success: false, error: 'from and to (ISO datetime) are required' }, { status: 400 })
  }

  const from = new Date(fromS)
  const to = new Date(toS)
  if (!(to.getTime() > from.getTime())) {
    return NextResponse.json({ success: false, error: 'to must be after from' }, { status: 400 })
  }

  const segments = await prisma.jobLaborScheduleSegment.findMany({
    where: {
      windowStart: { lt: to },
      windowEnd: { gt: from },
      estimate: { job: { type: { in: ['JOB', 'QUOTE'] } } },
    },
    include: {
      estimate: {
        include: {
          laborCode: { select: { id: true, code: true, name: true } },
          job: { select: { id: true, jobNumber: true, title: true } },
        },
      },
      assignments: { include: { employee: { select: { id: true, name: true, email: true } } } },
    },
    orderBy: { windowStart: 'asc' },
  })

  const normalized = segments.map((s) => ({
    id: s.id,
    hours: s.hours,
    windowStart: s.windowStart.toISOString(),
    windowEnd: s.windowEnd.toISOString(),
    laborCode: s.estimate.laborCode,
    job: s.estimate.job,
    estimateId: s.estimate.id,
    estimatedHours: s.estimate.estimatedHours,
    assignments: s.assignments.map((a) => ({
      id: a.id,
      hours: a.hours,
      employee: a.employee,
    })),
  }))

  if (sort === 'project') {
    const byJob = new Map<string, typeof normalized>()
    for (const row of normalized) {
      const jid = row.job.id
      if (!byJob.has(jid)) byJob.set(jid, [])
      byJob.get(jid)!.push(row)
    }
    return NextResponse.json({
      success: true,
      data: {
        sort: 'project',
        groups: Array.from(byJob.entries()).map(([jobId, rows]) => ({
          jobId,
          job: rows[0]?.job,
          segments: rows,
        })),
      },
    })
  }

  const byEmployee = new Map<string, { employee: { id: string; name: string | null; email: string } | null; rows: typeof normalized }>()
  const unassigned: typeof normalized = []

  for (const row of normalized) {
    if (row.assignments.length === 0) {
      unassigned.push(row)
      continue
    }
    for (const a of row.assignments) {
      const eid = a.employee.id
      if (!byEmployee.has(eid)) {
        byEmployee.set(eid, { employee: a.employee, rows: [] })
      }
      byEmployee.get(eid)!.rows.push({
        ...row,
        assignments: [a],
      })
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      sort: 'employee',
      groups: Array.from(byEmployee.entries()).map(([employeeId, g]) => ({
        employeeId,
        employee: g.employee,
        segments: g.rows,
      })),
      unassignedSegments: unassigned,
    },
  })
}
