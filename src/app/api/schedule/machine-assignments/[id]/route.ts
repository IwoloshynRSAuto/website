import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { roundToNearest15Minutes } from '@/lib/utils/time-rounding'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  shopMachineId: z.string().min(1).optional(),
  jobId: z.string().min(1).optional(),
  userId: z.string().optional().nullable(),
  plannedStart: z.string().datetime().optional(),
  plannedEnd: z.string().datetime().optional(),
  hours: z.number().positive().optional(),
  notes: z.string().optional().nullable(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await Promise.resolve(params)
  const body = await request.json()
  const data = patchSchema.parse(body)

  const existing = await prisma.machineShopAssignment.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
  }

  const startRaw = data.plannedStart ? new Date(data.plannedStart) : existing.plannedStart
  const endRaw = data.plannedEnd ? new Date(data.plannedEnd) : existing.plannedEnd
  const start = roundToNearest15Minutes(startRaw)
  const end = roundToNearest15Minutes(endRaw)
  if (!(end.getTime() > start.getTime())) {
    return NextResponse.json({ success: false, error: 'plannedEnd must be after plannedStart' }, { status: 400 })
  }

  const updated = await prisma.machineShopAssignment.update({
    where: { id },
    data: {
      ...(data.shopMachineId !== undefined ? { shopMachineId: data.shopMachineId } : {}),
      ...(data.jobId !== undefined ? { jobId: data.jobId } : {}),
      ...(data.userId !== undefined ? { userId: data.userId || null } : {}),
      ...(data.plannedStart !== undefined ? { plannedStart: start } : {}),
      ...(data.plannedEnd !== undefined ? { plannedEnd: end } : {}),
      ...(data.hours !== undefined ? { hours: data.hours } : {}),
      ...(data.notes !== undefined ? { notes: data.notes?.trim() || null } : {}),
    },
    include: {
      machine: { select: { id: true, name: true } },
      job: { select: { id: true, jobNumber: true, title: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  })

  return NextResponse.json({
    success: true,
    data: {
      ...updated,
      plannedStart: updated.plannedStart.toISOString(),
      plannedEnd: updated.plannedEnd.toISOString(),
    },
  })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await Promise.resolve(params)
  await prisma.machineShopAssignment.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
