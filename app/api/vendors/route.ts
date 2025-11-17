import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { VendorService } from '@/lib/vendors/service'
import { createVendorSchema, vendorFilterSchema } from '@/lib/vendors/schemas'

/**
 * GET /api/vendors
 * Get vendors with filters
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
    const filters = vendorFilterSchema.parse({
      search: searchParams.get('search') || undefined,
      category: searchParams.get('category') || undefined,
      isActive: searchParams.get('isActive') === 'true' ? true : searchParams.get('isActive') === 'false' ? false : undefined,
    })

    const vendors = await VendorService.getVendors(filters)

    return NextResponse.json({
      success: true,
      data: vendors,
    })
  } catch (error: any) {
    console.error('Error fetching vendors:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch vendors',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/vendors
 * Create a vendor
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
    const validatedData = createVendorSchema.parse(body)

    const vendor = await VendorService.createVendor(validatedData)

    return NextResponse.json(
      {
        success: true,
        data: vendor,
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
    console.error('Error creating vendor:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create vendor',
      },
      { status: 500 }
    )
  }
}

