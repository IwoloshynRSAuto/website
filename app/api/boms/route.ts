import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createBOMSchema = z.object({
  name: z.string().min(1, 'BOM name is required'),
  partIds: z.array(z.string()).optional().default([]),
  partQuantities: z.record(z.string(), z.number().int().positive()).optional(),
  linkedQuoteId: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') // 'DRAFT', 'ACTIVE', 'ARCHIVED', or null for all

    const where: any = {}
    if (statusFilter && ['DRAFT', 'ACTIVE', 'ARCHIVED'].includes(statusFilter)) {
      where.status = statusFilter
    }

    const boms = await prisma.bOM.findMany({
      where,
      include: {
        parts: {
          select: {
            id: true,
            quantity: true,
            purchasePrice: true,
            customerPrice: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    // Calculate totals for each BOM
    const bomsWithTotals = boms.map(bom => {
      const totalParts = bom.parts.length
      const totalCost = bom.parts.reduce((sum, part) => {
        return sum + (Number(part.purchasePrice) * part.quantity)
      }, 0)
      const totalCustomerPrice = bom.parts.reduce((sum, part) => {
        return sum + Number(part.customerPrice) // customerPrice already includes quantity
      }, 0)

      return {
        id: bom.id,
        name: bom.name,
        createdAt: bom.createdAt,
        updatedAt: bom.updatedAt,
        totalParts,
        totalCost,
        totalCustomerPrice,
        tags: bom.tags || null,
      }
    })

    return NextResponse.json({ boms: bomsWithTotals })
  } catch (error) {
    console.error('Error fetching BOMs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch BOMs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createBOMSchema.parse(body)

    // Create BOM
    const bom = await prisma.bOM.create({
      data: {
        name: validatedData.name,
        linkedQuoteId: validatedData.linkedQuoteId || null,
      },
    })

    // If partIds provided, create BOMParts from those parts
    if (validatedData.partIds && validatedData.partIds.length > 0) {
      const parts = await prisma.part.findMany({
        where: {
          id: { in: validatedData.partIds },
        },
      })

      const bomPartsData = parts.map(part => {
        const quantity = validatedData.partQuantities?.[part.id] || 1
        const purchasePrice = part.purchasePrice ? Number(part.purchasePrice) : 0
        const markupPercent = 20.0 // Default markup
        const customerPrice = purchasePrice * quantity * (1 + markupPercent / 100)

        return {
          bomId: bom.id,
          partId: part.id,
          partNumber: part.partNumber,
          quantity,
          purchasePrice,
          markupPercent,
          customerPrice,
          manufacturer: part.manufacturer,
          description: part.description,
          source: part.primarySource || null,
        }
      })

      await prisma.bOMPart.createMany({
        data: bomPartsData,
      })
    }

    // Return BOM with parts
    const bomWithParts = await prisma.bOM.findUnique({
      where: { id: bom.id },
      include: {
        parts: true,
      },
    })

    return NextResponse.json(bomWithParts, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error creating BOM:', error)
    return NextResponse.json(
      { error: 'Failed to create BOM' },
      { status: 500 }
    )
  }
}

