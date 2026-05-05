import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertWindow, sumSegmentHoursForEstimate } from '@/lib/schedule-v2/segments'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  windowStart: z.string().datetime().optional(),
  windowEnd: z.string().datetime().optional(),
  hours: z.number().positive().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; segmentId: string }> | { id: string; segmentId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const resolved = params instanceof Promise ? await params : params
  const { id: jobId, segmentId } = resolved

  const seg = await prisma.jobLaborScheduleSegment.findFirst({
    where: { id: segmentId, estimate: { jobId } },
    include: { estimate: { select: { id: true, estimatedHours: true } } },
  })
  if (!seg) {
    return NextResponse.json({ success: false, error: 'Segment not found' }, { status: 404 })
  }

  let body: z.infer<typeof patchSchema>
  try {
    body = patchSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 })
  }

  const ws = body.windowStart ? new Date(body.windowStart) : seg.windowStart
  const we = body.windowEnd ? new Date(body.windowEnd) : seg.windowEnd
  const hours = body.hours ?? seg.hours

  try {
    assertWindow(ws, we)
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Bad window' }, { status: 400 })
  }

  const assignedTotal = await sumAssignmentHoursForSegment(prisma, segmentId)
  if (hours < assignedTotal - 1e-6) {
    return NextResponse.json(
      {
        success: false,
        error: `Segment hours cannot be below assigned total (${assignedTotal}h). Remove or reduce assignments first.`,
      },
      { status: 400 }
    )
  }

  const others = await sumSegmentHoursForEstimate(prisma, seg.estimate.id, segmentId)
  const estimated = Number(seg.estimate.estimatedHours) || 0
  if (others + hours > estimated + 1e-6) {
    return NextResponse.json(
      {
        success: false,
        error: `Hours exceed quoted total (${estimated}h) for this labor line.`,
      },
      { status: 400 }
    )
  }

  const updated = await prisma.jobLaborScheduleSegment.update({
    where: { id: segmentId },
    data: {
      windowStart: ws,
      windowEnd: we,
      hours,
    },
    include: {
      estimate: { include: { laborCode: { select: { id: true, code: true, name: true } } } },
      assignments: { include: { employee: { select: { id: true, name: true, email: true } } } },
    },
  })

  return NextResponse.json({
    success: true,
    data: {
      ...updated,
      windowStart: updated.windowStart.toISOString(),
      windowEnd: updated.windowEnd.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; segmentId: string }> | { id: string; segmentId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const resolved = params instanceof Promise ? await params : params
  const { id: jobId, segmentId } = resolved

  const seg = await prisma.jobLaborScheduleSegment.findFirst({
    where: { id: segmentId, estimate: { jobId } },
  })
  if (!seg) {
    return NextResponse.json({ success: false, error: 'Segment not found' }, { status: 404 })
  }

  await prisma.jobLaborScheduleSegment.delete({ where: { id: segmentId } })
  return NextResponse.json({ success: true })
}
