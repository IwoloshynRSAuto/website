import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertWindow, sumSegmentHoursForEstimate } from '@/lib/schedule-v2/segments'
import { isSchedulableJobType } from '@/lib/schedule-v2/schedulable-job'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const postSchema = z.object({
  jobLaborEstimateId: z.string().min(1),
  windowStart: z.string().datetime(),
  windowEnd: z.string().datetime(),
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

  const segments = await prisma.jobLaborScheduleSegment.findMany({
    where: { estimate: { jobId } },
    include: {
      estimate: { include: { laborCode: { select: { id: true, code: true, name: true } } } },
      assignments: { include: { employee: { select: { id: true, name: true, email: true } } } },
    },
    orderBy: { windowStart: 'asc' },
  })

  return NextResponse.json({
    success: true,
    data: segments.map((s) => ({
      ...s,
      windowStart: s.windowStart.toISOString(),
      windowEnd: s.windowEnd.toISOString(),
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
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

  const est = await prisma.jobLaborEstimate.findFirst({
    where: { id: body.jobLaborEstimateId, jobId },
    select: { id: true, estimatedHours: true },
  })
  if (!est) {
    return NextResponse.json({ success: false, error: 'Labor estimate not on this job' }, { status: 404 })
  }

  const ws = new Date(body.windowStart)
  const we = new Date(body.windowEnd)
  try {
    assertWindow(ws, we)
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Bad window' }, { status: 400 })
  }

  const scheduledOthers = await sumSegmentHoursForEstimate(prisma, est.id)
  const estimated = Number(est.estimatedHours) || 0
  if (scheduledOthers + body.hours > estimated + 1e-6) {
    return NextResponse.json(
      {
        success: false,
        error: `Hours exceed quoted total (${estimated}h). Scheduled so far: ${scheduledOthers}h.`,
      },
      { status: 400 }
    )
  }

  const seg = await prisma.jobLaborScheduleSegment.create({
    data: {
      jobLaborEstimateId: est.id,
      windowStart: ws,
      windowEnd: we,
      hours: body.hours,
    },
    include: {
      estimate: { include: { laborCode: { select: { id: true, code: true, name: true } } } },
      assignments: { include: { employee: { select: { id: true, name: true, email: true } } } },
    },
  })

  return NextResponse.json({
    success: true,
    data: {
      ...seg,
      windowStart: seg.windowStart.toISOString(),
      windowEnd: seg.windowEnd.toISOString(),
      createdAt: seg.createdAt.toISOString(),
      updatedAt: seg.updatedAt.toISOString(),
    },
  })
}
