import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdmin } from '@/lib/auth/authorization'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (!isAdmin(session.user)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

  const plans = await prisma.quotePlan.findMany({
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    include: {
      items: {
        orderBy: [{ sortOrder: 'asc' }, { taskCode: 'asc' }],
        take: 2000,
      },
    },
    take: 500,
  })

  return NextResponse.json({ success: true, data: plans })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (!isAdmin(session.user)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

  const body = createSchema.parse(await req.json())
  const name = body.name.trim()

  const created = await prisma.quotePlan.create({
    data: {
      name,
      description: body.description?.trim() || null,
      isDefault: body.isDefault ?? false,
      isActive: true,
    },
  })

  if (created.isDefault) {
    await prisma.quotePlan.updateMany({
      where: { id: { not: created.id } },
      data: { isDefault: false },
    })
  }

  return NextResponse.json({ success: true, data: created }, { status: 201 })
}

