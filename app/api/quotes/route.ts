import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createQuoteSchema = z.object({
  bomId: z.string().min(1, 'BOM ID is required'),
  customerId: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')

    const quotes = await prisma.quote.findMany({
      where: {
        linkedBOMs: {
          some: {}, // Only quotes that have linked BOMs
        },
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      include: {
        linkedBOMs: {
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
        },
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Calculate totals for each quote
    const quotesWithTotals = quotes.map(quote => {
      // Get the first linked BOM (or calculate across all BOMs)
      const firstBOM = quote.linkedBOMs[0] || null
      const bomParts = firstBOM?.parts || []
      const totalCost = bomParts.reduce((sum, part) => {
        return sum + (Number(part.purchasePrice) * part.quantity)
      }, 0)
      const totalCustomerPrice = bomParts.reduce((sum, part) => {
        return sum + Number(part.customerPrice)
      }, 0)

      return {
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        title: quote.title,
        customerName: quote.customer?.name || null,
        bomId: firstBOM?.id || null,
        bomName: firstBOM?.name || null,
        status: quote.status,
        totalCost,
        totalCustomerPrice,
        createdAt: quote.createdAt,
        updatedAt: quote.updatedAt,
      }
    })

    return NextResponse.json({ quotes: quotesWithTotals })
  } catch (error) {
    console.error('Error fetching quotes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch quotes' },
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
    const validatedData = createQuoteSchema.parse(body)

    // Get the BOM
    const bom = await prisma.bOM.findUnique({
      where: { id: validatedData.bomId },
      include: {
        parts: true,
      },
    })

    if (!bom) {
      return NextResponse.json({ error: 'BOM not found' }, { status: 404 })
    }

    // Calculate quote totals
    const totalCost = bom.parts.reduce((sum, part) => {
      return sum + (Number(part.purchasePrice) * part.quantity)
    }, 0)
    const totalCustomerPrice = bom.parts.reduce((sum, part) => {
      return sum + Number(part.customerPrice)
    }, 0)

    // Generate quote number if not provided
    const lastQuote = await prisma.quote.findFirst({
      orderBy: { createdAt: 'desc' },
      where: {
        quoteNumber: { startsWith: 'Q' },
      },
    })
    let quoteNumber = 'Q0001'
    if (lastQuote) {
      const lastNum = parseInt(lastQuote.quoteNumber.replace('Q', ''), 10)
      if (!isNaN(lastNum)) {
        quoteNumber = `Q${String(lastNum + 1).padStart(4, '0')}`
      }
    }

    // Create quote
    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        title: `${bom.name} - Quote`,
        description: `Quote generated from BOM: ${bom.name}`,
        customerId: validatedData.customerId || null,
        amount: totalCustomerPrice,
        status: 'DRAFT',
        linkedBOMs: {
          connect: { id: validatedData.bomId },
        },
      },
      include: {
        linkedBOMs: true,
        customer: true,
      },
    })

    // Link BOM to quote
    await prisma.bOM.update({
      where: { id: validatedData.bomId },
      data: { 
        linkedQuoteId: quote.id,
      },
    })

    return NextResponse.json(quote, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error creating quote:', error)
    return NextResponse.json(
      { error: 'Failed to create quote' },
      { status: 500 }
    )
  }
}
