import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdmin } from '@/lib/auth/authorization'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  items: z
    .array(
      z.object({
        id: z.string().optional(),
        taskCode: z.string().min(1),
        description: z.string().min(1),
        sortOrder: z.number().int().optional(),
        laborCodeId: z.string().optional().nullable(),
      })
    )
    .optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (!isAdmin(session.user)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

  const resolved = params instanceof Promise ? await params : params
  const id = resolved.id
  const body = patchSchema.parse(await req.json())

  const updated = await prisma.quotePlan.update({
    where: { id },
    data: {
      name: body.name?.trim(),
      description: body.description === undefined ? undefined : body.description?.trim() || null,
      isActive: body.isActive,
      isDefault: body.isDefault,
    },
  })

  if (body.isDefault) {
    await prisma.quotePlan.updateMany({
      where: { id: { not: updated.id } },
      data: { isDefault: false },
    })
  }

  if (body.items) {
    await prisma.quotePlanItem.deleteMany({ where: { planId: id } })
    await prisma.quotePlanItem.createMany({
      data: body.items.map((it, idx) => ({
        planId: id,
        taskCode: it.taskCode.trim().toUpperCase(),
        description: it.description.trim(),
        sortOrder: it.sortOrder ?? idx,
        laborCodeId: it.laborCodeId ?? null,
      })),
    })
  }

  const hydrated = await prisma.quotePlan.findUnique({
    where: { id },
    include: { items: { orderBy: [{ sortOrder: 'asc' }, { taskCode: 'asc' }], take: 2000 } },
  })

  return NextResponse.json({ success: true, data: hydrated })
}

