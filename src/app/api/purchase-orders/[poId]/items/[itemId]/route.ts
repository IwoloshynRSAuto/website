import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  receivedQuantity: z.number().int().nonnegative().optional(),
  unitPrice: z.number().nonnegative().optional(),
  notes: z.string().nullable().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ poId: string; itemId: string }> | { poId: string; itemId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const resolved = await Promise.resolve(params)
  const { poId, itemId } = resolved

  try {
    const body = patchSchema.parse(await request.json())

    const existing = await prisma.purchaseOrderItem.findFirst({
      where: { id: itemId, purchaseOrderId: poId },
      select: { id: true, quantity: true },
    })
    if (!existing) return NextResponse.json({ success: false, error: 'PO item not found' }, { status: 404 })

    const updated = await prisma.purchaseOrderItem.update({
      where: { id: existing.id },
      data: {
        ...(body.receivedQuantity !== undefined
          ? { receivedQuantity: Math.min(body.receivedQuantity, existing.quantity) }
          : {}),
        ...(body.unitPrice !== undefined
          ? { unitPrice: body.unitPrice, totalPrice: body.unitPrice * existing.quantity }
          : {}),
        ...(body.notes !== undefined ? { notes: body.notes?.trim() || null } : {}),
      },
    })

    // Update PO status best-effort.
    const items = await prisma.purchaseOrderItem.findMany({
      where: { purchaseOrderId: poId },
      select: { quantity: true, receivedQuantity: true },
    })
    const allReceived = items.length > 0 && items.every((i) => i.receivedQuantity >= i.quantity)
    const anyReceived = items.some((i) => i.receivedQuantity > 0)
    await prisma.purchaseOrder.update({
      where: { id: poId },
      data: { status: allReceived ? 'RECEIVED' : anyReceived ? 'PARTIALLY_RECEIVED' : 'SENT' },
    }).catch(() => {})

    return NextResponse.json({ success: true, data: updated })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Validation error' }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : 'Failed to update PO item'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

