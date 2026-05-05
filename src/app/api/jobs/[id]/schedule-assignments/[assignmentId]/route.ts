import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sumAssignmentHoursForSegment } from '@/lib/schedule-v2/assignments'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  hours: z.number().positive(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> | { id: string; assignmentId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const resolved = params instanceof Promise ? await params : params
  const { id: jobId, assignmentId } = resolved

  const row = await prisma.jobLaborScheduleAssignment.findFirst({
    where: { id: assignmentId, segment: { estimate: { jobId } } },
    include: { segment: { select: { id: true, hours: true } } },
  })
  if (!row) {
    return NextResponse.json({ success: false, error: 'Assignment not found' }, { status: 404 })
  }

  let body: z.infer<typeof patchSchema>
  try {
    body = patchSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 })
  }

  const others = await sumAssignmentHoursForSegment(prisma, row.segment.id, assignmentId)
  const cap = Number(row.segment.hours) || 0
  if (others + body.hours > cap + 1e-6) {
    return NextResponse.json(
      { success: false, error: `Hours exceed segment capacity (${cap}h).` },
      { status: 400 }
    )
  }

  const updated = await prisma.jobLaborScheduleAssignment.update({
    where: { id: assignmentId },
    data: { hours: body.hours },
    include: { employee: { select: { id: true, name: true, email: true } }, segment: true },
  })

  return NextResponse.json({
    success: true,
    data: {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> | { id: string; assignmentId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const resolved = params instanceof Promise ? await params : params
  const { id: jobId, assignmentId } = resolved

  const row = await prisma.jobLaborScheduleAssignment.findFirst({
    where: { id: assignmentId, segment: { estimate: { jobId } } },
  })
  if (!row) {
    return NextResponse.json({ success: false, error: 'Assignment not found' }, { status: 404 })
  }

  await prisma.jobLaborScheduleAssignment.delete({ where: { id: assignmentId } })
  return NextResponse.json({ success: true })
}
