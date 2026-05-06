import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isAdmin } from '@/lib/auth/authorization'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createSchema = z.object({
  sourceBomId: z.string().min(1),
  name: z.string().min(1).max(120),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (!isAdmin(session.user)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

  const templates = await prisma.bOM.findMany({
    where: { status: 'ARCHIVED', tags: { contains: 'TEMPLATE' } },
    orderBy: { updatedAt: 'desc' },
    include: {
      parts: { select: { id: true } },
    },
    take: 500,
  })

  const shaped = templates.map((t) => ({
    id: t.id,
    name: t.name,
    notes: t.notes ?? null,
    tags: t.tags ?? null,
    status: t.status,
    partsCount: t.parts.length,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }))

  return NextResponse.json({ success: true, data: shaped })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (!isAdmin(session.user)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

  try {
    const body = createSchema.parse(await req.json())
    const source = await prisma.bOM.findUnique({
      where: { id: body.sourceBomId },
      include: { parts: { orderBy: { createdAt: 'asc' } } },
    })
    if (!source) return NextResponse.json({ success: false, error: 'Source BOM not found' }, { status: 404 })

    const created = await prisma.bOM.create({
      data: {
        name: body.name.trim(),
        status: 'ARCHIVED',
        tags: 'TEMPLATE',
        notes: source.notes ?? null,
        parts: {
          create: source.parts.map((p) => ({
            partId: p.partId,
            quantity: p.quantity,
            purchasePrice: p.purchasePrice,
            markupPercent: p.markupPercent,
            customerPrice: p.customerPrice,
            manufacturer: p.manufacturer,
            description: p.description,
            source: p.source,
            notes: p.notes,
            estimatedDelivery: p.estimatedDelivery,
            status: p.status,
            partNumber: p.partNumber,
          })),
        },
      },
    })

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Validation error' }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : 'Failed to create template'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

