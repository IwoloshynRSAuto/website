import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PartSaleService } from '@/lib/part-sales/service'
import { updatePartSaleSchema } from '@/lib/part-sales/schemas'
import { QuoteService } from '@/lib/quotes/service'

/**
 * GET /api/part-sales/[id]
 * Get part sale by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Handle params - could be a Promise in Next.js 15+
    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams

    // Use QuoteService to get quote, but verify it's a part sale
    const quote = await QuoteService.getQuoteById(id)

    if (quote.quoteType !== 'PART_SALE') {
      return NextResponse.json(
        {
          success: false,
          error: 'Quote is not a part sale',
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: quote,
    })
  } catch (error: any) {
    console.error('Error fetching part sale:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch part sale',
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/part-sales/[id]
 * Update a part sale
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Handle params - could be a Promise in Next.js 15+
    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams

    const body = await request.json()
    const validatedData = updatePartSaleSchema.partial().parse(body)

    const partSale = await PartSaleService.updatePartSale(id, validatedData, session.user.id)

    return NextResponse.json({
      success: true,
      data: partSale,
    })
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
    console.error('Error updating part sale:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update part sale',
      },
      { status: 500 }
    )
  }
}

