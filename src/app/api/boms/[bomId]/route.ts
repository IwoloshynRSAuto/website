import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
  tags: z.string().nullable().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bomId: string }> | { bomId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const resolved = await Promise.resolve(params)
  const bom = await prisma.bOM.findUnique({
    where: { id: resolved.bomId },
    include: {
      parts: {
        orderBy: { createdAt: 'asc' },
      },
      linkedQuote: {
        select: { id: true, quoteNumber: true, title: true },
      },
    },
  })
  if (!bom) return NextResponse.json({ success: false, error: 'BOM not found' }, { status: 404 })

  return NextResponse.json({ success: true, data: bom })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ bomId: string }> | { bomId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const resolved = await Promise.resolve(params)
  try {
    const body = await request.json()
    const parsed = patchSchema.parse(body)
    const updated = await prisma.bOM.update({
      where: { id: resolved.bomId },
      data: {
        ...(parsed.name !== undefined ? { name: parsed.name.trim() } : {}),
        ...(parsed.notes !== undefined ? { notes: parsed.notes?.trim() || null } : {}),
        ...(parsed.tags !== undefined ? { tags: parsed.tags?.trim() || null } : {}),
        ...(parsed.status !== undefined ? { status: parsed.status } : {}),
      },
      include: {
        parts: true,
        linkedQuote: { select: { id: true, quoteNumber: true, title: true } },
      },
    })
    return NextResponse.json({ success: true, data: updated })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Validation error' }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : 'Failed to update BOM'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

