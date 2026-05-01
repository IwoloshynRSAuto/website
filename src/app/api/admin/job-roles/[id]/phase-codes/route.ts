import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdmin } from '@/lib/auth/authorization'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const putSchema = z.object({
  laborCodeIds: z.array(z.string().min(1)).default([]),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (!isAdmin(session.user)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

  const { id } = await Promise.resolve(params)
  const body = await request.json()
  const data = putSchema.parse(body)

  const role = await prisma.jobRole.findUnique({ where: { id }, select: { id: true } })
  if (!role) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

  // Ensure codes exist (ignore invalid ids silently)
  const existingCodes = await prisma.laborCode.findMany({
    where: { id: { in: data.laborCodeIds }, isActive: true },
    select: { id: true },
  })
  const keepIds = existingCodes.map((x) => x.id)

  await prisma.$transaction(async (tx) => {
    await tx.jobRolePhaseCode.deleteMany({ where: { jobRoleId: id } })
    if (keepIds.length) {
      await tx.jobRolePhaseCode.createMany({
        data: keepIds.map((laborCodeId) => ({ jobRoleId: id, laborCodeId })),
        skipDuplicates: true,
      })
    }
  })

  return NextResponse.json({ success: true })
}

