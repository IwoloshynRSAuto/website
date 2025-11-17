import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { VendorService } from '@/lib/vendors/service'
import { createVendorPartPriceSchema, vendorPartPriceFilterSchema } from '@/lib/vendors/schemas'

/**
 * GET /api/vendors/part-prices
 * Get vendor part prices with filters
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
    const filters = vendorPartPriceFilterSchema.parse({
      vendorId: searchParams.get('vendorId') || undefined,
      partId: searchParams.get('partId') || undefined,
      effectiveDate: searchParams.get('effectiveDate') || undefined,
    })

    const prices = await VendorService.getVendorPartPrices(filters)

    return NextResponse.json({
      success: true,
      data: prices,
    })
  } catch (error: any) {
    console.error('Error fetching vendor part prices:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch vendor part prices',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/vendors/part-prices
 * Create a vendor part price
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
    const validatedData = createVendorPartPriceSchema.parse(body)

    const price = await VendorService.createVendorPartPrice(validatedData)

    return NextResponse.json(
      {
        success: true,
        data: price,
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
    console.error('Error creating vendor part price:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create vendor part price',
      },
      { status: 500 }
    )
  }
}

