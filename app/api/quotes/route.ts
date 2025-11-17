import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { QuoteService } from '@/lib/quotes/service'
import { createQuoteSchema, quoteFilterSchema } from '@/lib/quotes/schemas'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const filters = quoteFilterSchema.parse({
      status: searchParams.get('status') || undefined,
      customerId: searchParams.get('customerId') || undefined,
      search: searchParams.get('search') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    })

    const quotes = await QuoteService.getQuotes(filters)

    // Format response
    const quotesData = quotes.map((quote) => {
      const firstBOM = quote.linkedBOMs[0] || null
      const bomParts = firstBOM?.parts || []
      const totalCost = bomParts.reduce((sum, part) => {
        return sum + Number(part.purchasePrice) * part.quantity
      }, 0)
      const totalCustomerPrice = bomParts.reduce((sum, part) => {
        return sum + Number(part.customerPrice)
      }, 0)

      return {
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        title: quote.title,
        customerName: quote.customer?.name || null,
        customerId: quote.customer?.id || null,
        bomId: firstBOM?.id || null,
        bomName: firstBOM?.name || null,
        status: quote.status,
        amount: quote.amount,
        totalCost,
        totalCustomerPrice,
        fileCount: quote._count?.fileRecords || 0,
        fileRecords: quote.fileRecords || [],
        createdAt: quote.createdAt,
        updatedAt: quote.updatedAt,
        validUntil: quote.validUntil,
        lastFollowUp: quote.lastFollowUp,
      }
    })

    return NextResponse.json({
      success: true,
      data: quotesData,
    })
  } catch (error: any) {
    console.error('Error fetching quotes:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch quotes',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = createQuoteSchema.parse(body)

    // Use QuoteService to create quote
    const quote = await QuoteService.createQuote(validatedData, session.user.id)

    return NextResponse.json(
      {
        success: true,
        data: quote,
      },
      { status: 201 }
    )
  } catch (error: any) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.message,
        },
        { status: 400 }
      )
    }
    console.error('Error creating quote:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create quote',
      },
      { status: 500 }
    )
  }
}
