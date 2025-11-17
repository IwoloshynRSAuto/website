import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PartSaleService } from '@/lib/part-sales/service'
import { createPartSaleSchema } from '@/lib/part-sales/schemas'

/**
 * GET /api/part-sales
 * Get part sales (quotes with quoteType = 'PART_SALE')
 */
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
    const filters = {
      status: searchParams.get('status') || undefined,
      customerId: searchParams.get('customerId') || undefined,
      search: searchParams.get('search') || undefined,
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
    }

    const partSales = await PartSaleService.getPartSales(filters)

    return NextResponse.json({
      success: true,
      data: partSales,
    })
  } catch (error: any) {
    console.error('Error fetching part sales:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch part sales',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/part-sales
 * Create a part sale quote
 */
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
    const validatedData = createPartSaleSchema.parse(body)

    const partSale = await PartSaleService.createPartSale(validatedData, session.user.id)

    return NextResponse.json(
      {
        success: true,
        data: partSale,
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
    console.error('Error creating part sale:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create part sale',
      },
      { status: 500 }
    )
  }
}

