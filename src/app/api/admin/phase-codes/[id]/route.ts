import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdmin } from '@/lib/auth/authorization'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  code: z.string().min(1).max(30).optional(),
  name: z.string().min(1).max(120).optional(),
  description: z.string().optional().nullable(),
  hourlyRate: z.number().optional().nullable(),
  isActive: z.boolean().optional(),
  isOvertimePhase: z.boolean().optional(),
  overtimeRateMultiplier: z.number().positive().max(10).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (!isAdmin(session.user)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

  const { id } = await Promise.resolve(params)
  const body = await request.json()
  const data = patchSchema.parse(body)

  const nextCode = data.code !== undefined ? data.code.trim().toUpperCase() : undefined

  const updated = await prisma.laborCode.update({
    where: { id },
    data: {
      ...(nextCode !== undefined ? { code: nextCode } : {}),
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
      ...(data.hourlyRate !== undefined ? { hourlyRate: data.hourlyRate ?? 0 } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      ...(data.isOvertimePhase !== undefined ? { isOvertimePhase: data.isOvertimePhase } : {}),
      ...(data.overtimeRateMultiplier !== undefined ? { overtimeRateMultiplier: data.overtimeRateMultiplier } : {}),
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

  return NextResponse.json({
    success: true,
    data: {
      ...updated,
      hourlyRate: updated.hourlyRate != null ? Number(updated.hourlyRate) : 0,
      overtimeRateMultiplier:
        updated.overtimeRateMultiplier != null ? Number(updated.overtimeRateMultiplier) : 1.5,
    },
  })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (!isAdmin(session.user)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

  const { id } = await Promise.resolve(params)

  // If referenced, soft-deactivate instead of hard delete.
  const refs = await prisma.timeEntry.count({ where: { laborCodeId: id } })
  if (refs > 0) {
    const updated = await prisma.laborCode.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, code: true, name: true, description: true, hourlyRate: true, isActive: true },
    })
    return NextResponse.json({
      success: true,
      data: { ...updated, hourlyRate: updated.hourlyRate != null ? Number(updated.hourlyRate) : 0 },
    })
  }

  await prisma.$transaction(async (tx) => {
    await tx.jobRolePhaseCode.deleteMany({ where: { laborCodeId: id } })
    await tx.userPhaseCodeOverride.deleteMany({ where: { laborCodeId: id } })
    await tx.laborCode.delete({ where: { id } })
  })

  return NextResponse.json({ success: true })
}

