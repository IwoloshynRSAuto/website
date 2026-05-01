import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdmin } from '@/lib/auth/authorization'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  jobRoleId: z.string().nullable(),
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

  if (data.jobRoleId) {
    const role = await prisma.jobRole.findUnique({ where: { id: data.jobRoleId }, select: { id: true } })
    if (!role) return NextResponse.json({ success: false, error: 'Invalid jobRoleId' }, { status: 400 })
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { jobRoleId: data.jobRoleId },
    select: { id: true, jobRoleId: true },
  })

  return NextResponse.json({ success: true, data: updated })
}

