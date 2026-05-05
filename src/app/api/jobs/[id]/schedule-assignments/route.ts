import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sumAssignmentHoursForSegment } from '@/lib/schedule-v2/assignments'
import { isSchedulableJobType } from '@/lib/schedule-v2/schedulable-job'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const postSchema = z.object({
  segmentId: z.string().min(1),
  employeeId: z.string().min(1),
  hours: z.number().positive(),
})

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const resolved = params instanceof Promise ? await params : params
  const jobId = resolved.id

  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { id: true, type: true } })
  if (!job || !isSchedulableJobType(job.type)) {
    return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 })
  }

  const rows = await prisma.jobLaborScheduleAssignment.findMany({
    where: { segment: { estimate: { jobId } } },
    include: {
      segment: {
        include: {
          estimate: { include: { laborCode: { select: { id: true, code: true, name: true } } } },
        },
      },
      employee: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({
    success: true,
    data: rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      segment: {
        ...r.segment,
        windowStart: r.segment.windowStart.toISOString(),
        windowEnd: r.segment.windowEnd.toISOString(),
        createdAt: r.segment.createdAt.toISOString(),
        updatedAt: r.segment.updatedAt.toISOString(),
      },
    })),
  })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const resolved = params instanceof Promise ? await params : params
  const jobId = resolved.id

  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { id: true, type: true } })
  if (!job || !isSchedulableJobType(job.type)) {
    return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 })
  }

  let body: z.infer<typeof postSchema>
  try {
    body = postSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 })
  }

  const segment = await prisma.jobLaborScheduleSegment.findFirst({
    where: { id: body.segmentId, estimate: { jobId } },
    select: { id: true, hours: true },
  })
  if (!segment) {
    return NextResponse.json({ success: false, error: 'Segment not on this job' }, { status: 404 })
  }

  const emp = await prisma.user.findFirst({
    where: { id: body.employeeId, isActive: true },
    select: { id: true },
  })
  if (!emp) {
    return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 })
  }

  const assignedOthers = await sumAssignmentHoursForSegment(prisma, segment.id)
  const cap = Number(segment.hours) || 0
  if (assignedOthers + body.hours > cap + 1e-6) {
    return NextResponse.json(
      {
        success: false,
        error: `Assignment hours exceed segment total (${cap}h). Already assigned: ${assignedOthers}h.`,
      },
      { status: 400 }
    )
  }

  const row = await prisma.jobLaborScheduleAssignment.create({
    data: {
      segmentId: segment.id,
      employeeId: body.employeeId,
      hours: body.hours,
    },
    include: {
      segment: true,
      employee: { select: { id: true, name: true, email: true } },
    },
  })

  return NextResponse.json({
    success: true,
    data: {
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    },
  })
}
