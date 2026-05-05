import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdmin, type User as AuthUser } from '@/lib/auth/authorization'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createSchema = z.object({
  name: z.string().min(1).max(120),
  phaseCodeId: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
})

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const fromQ = searchParams.get('from')
  const toQ = searchParams.get('to')
  const from = fromQ ? new Date(fromQ) : new Date()
  const to = toQ ? new Date(toQ) : new Date(from.getTime() + 30 * 86_400_000)

  const machines = await prisma.shopMachine.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      phaseCode: { select: { id: true, code: true, name: true } },
      assignments: {
        where: {
          plannedStart: { lt: to },
          plannedEnd: { gt: from },
        },
        include: {
          job: { select: { id: true, jobNumber: true, title: true } },
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { plannedStart: 'asc' },
      },
    },
  })

  return NextResponse.json({
    success: true,
    data: {
      from: from.toISOString(),
      to: to.toISOString(),
      machines: machines.map((m) => ({
        id: m.id,
        name: m.name,
        sortOrder: m.sortOrder,
        phaseCode: m.phaseCode,
        assignments: m.assignments.map((a) => ({
          id: a.id,
          jobId: a.jobId,
          job: a.job,
          userId: a.userId,
          user: a.user,
          plannedStart: a.plannedStart.toISOString(),
          plannedEnd: a.plannedEnd.toISOString(),
          hours: a.hours,
          notes: a.notes,
        })),
      })),
    },
  })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdmin(session.user as AuthUser)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const data = createSchema.parse(body)

  const created = await prisma.shopMachine.create({
    data: {
      name: data.name.trim(),
      phaseCodeId: data.phaseCodeId || null,
      sortOrder: data.sortOrder ?? 0,
    },
    include: { phaseCode: { select: { id: true, code: true, name: true } } },
  })

  return NextResponse.json({ success: true, data: created }, { status: 201 })
}
