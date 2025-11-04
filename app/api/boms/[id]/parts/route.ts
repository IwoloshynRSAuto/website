import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createBOMPartSchema = z.object({
  partId: z.string().optional().nullable(),
  partNumber: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  purchasePrice: z.number().nonnegative().default(0),
  markupPercent: z.number().nonnegative().default(20),
  manufacturer: z.string().optional(), // Optional if partId is provided
  description: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  estimatedDelivery: z.string().optional().nullable(), // ISO date string
  status: z.enum(['HOLD', 'ORDER', 'PLACED', 'HERE', 'STOCK', 'CUSTOMER_SUPPLIED']).default('HOLD'),
})

const updateBOMPartSchema = createBOMPartSchema.partial()

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
    const { id: bomId } = resolvedParams

    const parts = await prisma.bOMPart.findMany({
      where: { bomId },
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
    })

    return NextResponse.json({ parts })
  } catch (error) {
    console.error('Error fetching BOM parts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch BOM parts' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const { id: bomId } = resolvedParams

    const body = await request.json()
    const validatedData = createBOMPartSchema.parse(body)

    // Calculate customer price: purchasePrice * quantity * (1 + markupPercent / 100)
    const customerPrice = validatedData.purchasePrice * validatedData.quantity * (1 + validatedData.markupPercent / 100)

    // If partId provided, fetch part details
    let partNumber = validatedData.partNumber
    let manufacturer = validatedData.manufacturer || ''
    let description = validatedData.description
    let source = validatedData.source

    if (validatedData.partId) {
      const part = await prisma.part.findUnique({
        where: { id: validatedData.partId },
      })

      if (part) {
        partNumber = part.partNumber
        manufacturer = part.manufacturer
        description = description || part.description || null
        source = source || part.primarySource || null
      }
    } else if (!manufacturer) {
      // If no partId and no manufacturer provided, error
      return NextResponse.json(
        { error: 'Manufacturer is required when partId is not provided' },
        { status: 400 }
      )
    }

    const bomPart = await prisma.bOMPart.create({
      data: {
        bomId,
        partId: validatedData.partId || null,
        partNumber,
        quantity: validatedData.quantity,
        purchasePrice: validatedData.purchasePrice,
        markupPercent: validatedData.markupPercent,
        customerPrice,
        manufacturer,
        description,
        source,
        notes: validatedData.notes || null,
        estimatedDelivery: validatedData.estimatedDelivery
          ? new Date(validatedData.estimatedDelivery)
          : null,
        status: validatedData.status,
      },
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
    })

    return NextResponse.json(bomPart, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error creating BOM part:', error)
    return NextResponse.json(
      { error: 'Failed to create BOM part' },
      { status: 500 }
    )
  }
}

