import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateBOMSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
  notes: z.string().optional().nullable(),
  tags: z.string().optional().nullable(), // JSON array as string
  linkedQuoteId: z.string().optional().nullable(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams

    const bom = await prisma.bOM.findUnique({
      where: { id },
      include: {
        parts: {
          include: {
            originalPart: {
              select: {
                id: true,
                partNumber: true,
                manufacturer: true,
                description: true,
                category: true,
                subcategory: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!bom) {
      return NextResponse.json({ error: 'BOM not found' }, { status: 404 })
    }

    // Calculate totals
    const totalCost = bom.parts.reduce((sum, part) => {
      return sum + (Number(part.purchasePrice) * part.quantity)
    }, 0)
    const totalCustomerPrice = bom.parts.reduce((sum, part) => {
      return sum + Number(part.customerPrice) // customerPrice already includes quantity
    }, 0)

    return NextResponse.json({
      ...bom,
      totalCost,
      totalCustomerPrice,
    })
  } catch (error) {
    console.error('Error fetching BOM:', error)
    return NextResponse.json(
      { error: 'Failed to fetch BOM' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams

    const body = await request.json()
    const validatedData = updateBOMSchema.partial().parse(body)

    const updateData: any = { ...validatedData }
    
    // Parse tags if it's a string
    if (validatedData.tags !== undefined && typeof validatedData.tags === 'string') {
      try {
        JSON.parse(validatedData.tags) // Validate it's valid JSON
        updateData.tags = validatedData.tags
      } catch (e) {
        // If invalid JSON, store as-is or handle error
        updateData.tags = validatedData.tags
      }
    }

    const updatedBOM = await prisma.bOM.update({
      where: { id },
      data: updateData,
      include: {
        parts: true,
        linkedQuote: {
          select: {
            id: true,
            quoteNumber: true,
            title: true,
          },
        },
      },
    })

    return NextResponse.json(updatedBOM)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error updating BOM:', error)
    return NextResponse.json(
      { error: 'Failed to update BOM' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams

    // First, find all quotes that have this BOM linked and disconnect it
    const quotesWithBOM = await prisma.quote.findMany({
      where: {
        linkedBOMs: {
          some: { id }
        }
      },
      select: { id: true }
    })

    // Disconnect the BOM from each quote individually
    for (const quote of quotesWithBOM) {
      await prisma.quote.update({
        where: { id: quote.id },
        data: {
          linkedBOMs: {
            disconnect: { id }
          }
        }
      })
    }

    // Also clear the linkedQuoteId if this BOM is linked to a quote
    await prisma.bOM.update({
      where: { id },
      data: {
        linkedQuoteId: null
      }
    }).catch(() => {
      // Ignore if update fails, BOM might not have linkedQuoteId
    })

    // Delete all BOM parts first (cascade delete)
    await prisma.bOMPart.deleteMany({
      where: { bomId: id }
    })

    // Then delete the BOM
    await prisma.bOM.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'BOM deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting BOM:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete BOM' },
      { status: 500 }
    )
  }
}

