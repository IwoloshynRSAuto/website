import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { roundToNearest15Minutes } from '@/lib/utils/time-rounding'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createSchema = z.object({
  shopMachineId: z.string().min(1),
  jobId: z.string().min(1),
  userId: z.string().optional().nullable(),
  plannedStart: z.string().datetime(),
  plannedEnd: z.string().datetime(),
  hours: z.number().positive().optional(),
  notes: z.string().optional().nullable(),
})

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const data = createSchema.parse(body)
  const startRaw = new Date(data.plannedStart)
  const endRaw = new Date(data.plannedEnd)
  const start = roundToNearest15Minutes(startRaw)
  const end = roundToNearest15Minutes(endRaw)
  if (!(end.getTime() > start.getTime())) {
    return NextResponse.json({ success: false, error: 'plannedEnd must be after plannedStart' }, { status: 400 })
  }
  const spanH = (end.getTime() - start.getTime()) / 3_600_000
  const hours = data.hours ?? spanH

  const created = await prisma.machineShopAssignment.create({
    data: {
      shopMachineId: data.shopMachineId,
      jobId: data.jobId,
      userId: data.userId || null,
      plannedStart: start,
      plannedEnd: end,
      hours,
      notes: data.notes?.trim() || null,
    },
    include: {
      machine: { select: { id: true, name: true } },
      job: { select: { id: true, jobNumber: true, title: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  })

  return NextResponse.json(
    {
      success: true,
      data: {
        ...created,
        plannedStart: created.plannedStart.toISOString(),
        plannedEnd: created.plannedEnd.toISOString(),
      },
    },
    { status: 201 }
  )
}
