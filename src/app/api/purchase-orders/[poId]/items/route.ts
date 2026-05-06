import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createSchema = z.object({
  partId: z.string().optional().nullable(),
  description: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  notes: z.string().optional().nullable(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ poId: string }> | { poId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const resolved = await Promise.resolve(params)
  const poId = resolved.poId

  try {
    const body = createSchema.parse(await request.json())
    const created = await prisma.purchaseOrderItem.create({
      data: {
        purchaseOrderId: poId,
        partId: body.partId ?? null,
        description: body.description.trim(),
        quantity: body.quantity,
        unitPrice: body.unitPrice,
        totalPrice: body.unitPrice * body.quantity,
        notes: body.notes?.trim() || null,
      },
      include: { part: { select: { id: true, partNumber: true, manufacturer: true } } },
    })
    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Validation error' }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : 'Failed to add PO item'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

