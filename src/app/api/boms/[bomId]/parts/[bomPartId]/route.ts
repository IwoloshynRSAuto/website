import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  quantity: z.number().int().positive().optional(),
  purchasePrice: z.number().nonnegative().optional(),
  markupPercent: z.number().min(0).max(1000).optional(),
  source: z.string().nullable().optional(),
  status: z.enum(['HOLD', 'ORDER', 'PLACED', 'HERE', 'STOCK', 'CUSTOMER_SUPPLIED']).optional(),
  estimatedDelivery: z.string().nullable().optional(), // yyyy-MM-dd
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ bomId: string; bomPartId: string }> | { bomId: string; bomPartId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const resolved = await Promise.resolve(params)
  const { bomId, bomPartId } = resolved

  try {
    const body = await request.json()
    const parsed = patchSchema.parse(body)

    const existing = await prisma.bOMPart.findFirst({
      where: { id: bomPartId, bomId },
      select: { id: true, bomId: true, quantity: true, purchasePrice: true, markupPercent: true },
    })
    if (!existing) return NextResponse.json({ success: false, error: 'BOM part not found' }, { status: 404 })

    const qty = parsed.quantity ?? existing.quantity
    const purchasePrice = parsed.purchasePrice ?? existing.purchasePrice
    const markupPercent = parsed.markupPercent ?? existing.markupPercent
    const customerPrice = Number(purchasePrice) * Number(qty) * (1 + Number(markupPercent) / 100)

    const updated = await prisma.bOMPart.update({
      where: { id: existing.id },
      data: {
        ...(parsed.quantity !== undefined ? { quantity: parsed.quantity } : {}),
        ...(parsed.purchasePrice !== undefined ? { purchasePrice: parsed.purchasePrice } : {}),
        ...(parsed.markupPercent !== undefined ? { markupPercent: parsed.markupPercent } : {}),
        customerPrice,
        ...(parsed.source !== undefined ? { source: parsed.source?.trim() || null } : {}),
        ...(parsed.status !== undefined ? { status: parsed.status } : {}),
        ...(parsed.estimatedDelivery !== undefined
          ? {
              estimatedDelivery: parsed.estimatedDelivery ? new Date(`${parsed.estimatedDelivery}T12:00:00`) : null,
            }
          : {}),
      },
      select: {
        id: true,
        bomId: true,
        quantity: true,
        purchasePrice: true,
        markupPercent: true,
        customerPrice: true,
        source: true,
        status: true,
        estimatedDelivery: true,
        partNumber: true,
        manufacturer: true,
        description: true,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Validation error' }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : 'Failed to update BOM part'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ bomId: string; bomPartId: string }> | { bomId: string; bomPartId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const resolved = await Promise.resolve(params)
  const { bomId, bomPartId } = resolved

  try {
    const existing = await prisma.bOMPart.findFirst({ where: { id: bomPartId, bomId }, select: { id: true } })
    if (!existing) return NextResponse.json({ success: false, error: 'BOM part not found' }, { status: 404 })
    await prisma.bOMPart.delete({ where: { id: existing.id } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete BOM part'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

