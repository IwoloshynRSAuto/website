import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdmin } from '@/lib/auth/authorization'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  code: z.string().min(1).max(20).optional(),
  name: z.string().min(1).max(120).optional(),
  description: z.string().optional().nullable(),
  hourlyRate: z.number().optional().nullable(),
  isActive: z.boolean().optional(),
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

  const updated = await prisma.laborCode.update({
    where: { id },
    data: {
      ...(data.code !== undefined ? { code: data.code.trim().toUpperCase() } : {}),
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
      ...(data.hourlyRate !== undefined ? { hourlyRate: data.hourlyRate ?? 0 } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
    select: { id: true, code: true, name: true, description: true, hourlyRate: true, isActive: true },
  })

  return NextResponse.json({ success: true, data: updated })
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
    return NextResponse.json({ success: true, data: updated })
  }

  await prisma.$transaction(async (tx) => {
    await tx.jobRolePhaseCode.deleteMany({ where: { laborCodeId: id } })
    await tx.userPhaseCodeOverride.deleteMany({ where: { laborCodeId: id } })
    await tx.laborCode.delete({ where: { id } })
  })

  return NextResponse.json({ success: true })
}

