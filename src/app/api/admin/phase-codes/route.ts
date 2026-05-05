import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdmin } from '@/lib/auth/authorization'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { withOtLaborCodeSuffix } from '@/lib/labor-codes/ot-code'

export const dynamic = 'force-dynamic'

const createSchema = z.object({
  code: z.string().min(1).max(30),
  name: z.string().min(1).max(120),
  description: z.string().optional().nullable(),
  hourlyRate: z.number().optional().nullable(),
  isActive: z.boolean().optional(),
  isOvertimePhase: z.boolean().optional(),
  overtimeRateMultiplier: z.number().positive().max(10).optional(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (!isAdmin(session.user)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

  const codes = await prisma.laborCode.findMany({
    where: {},
    orderBy: [{ code: 'asc' }],
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      hourlyRate: true,
      isActive: true,
      isOvertimePhase: true,
      overtimeRateMultiplier: true,
    },
    take: 5000,
  })
  const data = codes.map((row) => ({
    ...row,
    hourlyRate: row.hourlyRate != null ? Number(row.hourlyRate) : 0,
    overtimeRateMultiplier: row.overtimeRateMultiplier != null ? Number(row.overtimeRateMultiplier) : 1.5,
  }))
  return NextResponse.json({ success: true, data })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (!isAdmin(session.user)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const data = createSchema.parse(body)
  const raw = data.code.trim().toUpperCase()
  const wantsOt = Boolean(data.isOvertimePhase)
  const codeUpper = wantsOt ? withOtLaborCodeSuffix(raw) : raw
  const isOt = wantsOt || /\/OT$/i.test(codeUpper)

  const created = await prisma.laborCode.create({
    data: {
      code: codeUpper,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      category: 'PHASE',
      hourlyRate: data.hourlyRate ?? 0,
      isActive: data.isActive ?? true,
      isOvertimePhase: isOt,
      overtimeRateMultiplier: data.overtimeRateMultiplier ?? 1.5,
    },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      hourlyRate: true,
      isActive: true,
      isOvertimePhase: true,
      overtimeRateMultiplier: true,
    },
  })

  return NextResponse.json(
    {
      success: true,
      data: {
        ...created,
        hourlyRate: created.hourlyRate != null ? Number(created.hourlyRate) : 0,
        overtimeRateMultiplier:
          created.overtimeRateMultiplier != null ? Number(created.overtimeRateMultiplier) : 1.5,
      },
    },
    { status: 201 }
  )
}

