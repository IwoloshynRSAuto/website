import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdmin } from '@/lib/auth/authorization'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (!isAdmin(session.user)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

  const { id } = await Promise.resolve(params)
  const role = await prisma.jobRole.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      phaseCodes: { select: { laborCode: { select: { id: true, code: true, name: true, isActive: true } } } },
      createdAt: true,
      updatedAt: true,
    },
  })
  if (!role) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    success: true,
    data: {
      ...role,
      phaseCodes: role.phaseCodes.map((x) => x.laborCode).filter((x) => x.isActive),
    },
  })
}

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

  const updated = await prisma.jobRole.update({
    where: { id },
    data: {
      ...(data.name ? { name: data.name.trim() } : {}),
      ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
    select: { id: true, name: true, description: true, isActive: true, createdAt: true, updatedAt: true },
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

  const assignedUsers = await prisma.user.count({ where: { jobRoleId: id } })
  if (assignedUsers > 0) {
    return NextResponse.json(
      { success: false, error: 'Cannot delete: role is assigned to one or more users. Unassign users first or deactivate the role.' },
      { status: 409 }
    )
  }

  await prisma.$transaction(async (tx) => {
    await tx.jobRolePhaseCode.deleteMany({ where: { jobRoleId: id } })
    await tx.jobRole.delete({ where: { id } })
  })

  return NextResponse.json({ success: true })
}

