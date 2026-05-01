import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdmin } from '@/lib/auth/authorization'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const putSchema = z.object({
  userIds: z.array(z.string().min(1)).default([]),
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

  const uniqueIds = Array.from(new Set(data.userIds))

  await prisma.$transaction(async (tx) => {
    // Unassign users currently in this category but not in the new list
    await tx.user.updateMany({
      where: { jobRoleId: id, id: { notIn: uniqueIds } },
      data: { jobRoleId: null },
    })

    // Assign the selected users to this category
    if (uniqueIds.length) {
      await tx.user.updateMany({
        where: { id: { in: uniqueIds } },
        data: { jobRoleId: id },
      })
    }
  })

  return NextResponse.json({ success: true })
}

