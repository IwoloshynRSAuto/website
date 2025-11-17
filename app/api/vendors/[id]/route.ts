import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { VendorService } from '@/lib/vendors/service'
import { updateVendorSchema } from '@/lib/vendors/schemas'

/**
 * GET /api/vendors/[id]
 * Get vendor by ID
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

    const vendor = await VendorService.getVendorById(id)

    return NextResponse.json({
      success: true,
      data: vendor,
    })
  } catch (error: any) {
    console.error('Error fetching vendor:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch vendor',
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/vendors/[id]
 * Update a vendor
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
    const validatedData = updateVendorSchema.partial().parse(body)

    const vendor = await VendorService.updateVendor(id, validatedData)

    return NextResponse.json({
      success: true,
      data: vendor,
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
    console.error('Error updating vendor:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update vendor',
      },
      { status: 500 }
    )
  }
}

