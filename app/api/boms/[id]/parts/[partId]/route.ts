import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateBOMPartSchema = z.object({
  quantity: z.number().int().positive().optional(),
  purchasePrice: z.number().nonnegative().optional(),
  markupPercent: z.number().nonnegative().optional(),
  description: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  estimatedDelivery: z.string().optional().nullable(),
  status: z.enum(['HOLD', 'ORDER', 'PLACED', 'HERE', 'STOCK', 'CUSTOMER_SUPPLIED']).optional(),
  manufacturer: z.string().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; partId: string }> | { id: string; partId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const { partId } = resolvedParams

    const body = await request.json()
    const validatedData = updateBOMPartSchema.partial().parse(body)

    // Get current part to calculate new customer price
    const currentPart = await prisma.bOMPart.findUnique({
      where: { id: partId },
    })

    if (!currentPart) {
      return NextResponse.json({ error: 'BOM part not found' }, { status: 404 })
    }

    const updateData: any = { ...validatedData }

    // Recalculate customer price if purchasePrice, markupPercent, or quantity changed
    if (validatedData.purchasePrice !== undefined || validatedData.markupPercent !== undefined || validatedData.quantity !== undefined) {
      const purchasePrice = validatedData.purchasePrice !== undefined
        ? validatedData.purchasePrice
        : Number(currentPart.purchasePrice)
      const markupPercent = validatedData.markupPercent !== undefined
        ? validatedData.markupPercent
        : Number(currentPart.markupPercent)
      const quantity = validatedData.quantity !== undefined
        ? validatedData.quantity
        : currentPart.quantity
      updateData.customerPrice = purchasePrice * quantity * (1 + markupPercent / 100)
      if (validatedData.purchasePrice !== undefined) updateData.purchasePrice = purchasePrice
      if (validatedData.markupPercent !== undefined) updateData.markupPercent = markupPercent
      if (validatedData.quantity !== undefined) updateData.quantity = quantity
    }

    if (validatedData.estimatedDelivery !== undefined) {
      updateData.estimatedDelivery = validatedData.estimatedDelivery
        ? new Date(validatedData.estimatedDelivery)
        : null
    }

    const updatedPart = await prisma.bOMPart.update({
      where: { id: partId },
      data: updateData,
      include: {
        originalPart: {
          select: {
            id: true,
            partNumber: true,
            manufacturer: true,
            description: true,
          },
        },
      },
    })

    return NextResponse.json(updatedPart)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error updating BOM part:', error)
    return NextResponse.json(
      { error: 'Failed to update BOM part' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; partId: string }> | { id: string; partId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const { partId } = resolvedParams

    await prisma.bOMPart.delete({
      where: { id: partId },
    })

    return NextResponse.json({ message: 'BOM part deleted successfully' })
  } catch (error) {
    console.error('Error deleting BOM part:', error)
    return NextResponse.json(
      { error: 'Failed to delete BOM part' },
      { status: 500 }
    )
  }
}

