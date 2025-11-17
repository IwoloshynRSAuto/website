import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { VendorService } from '@/lib/vendors/service'

/**
 * GET /api/vendors/[id]/metrics
 * Get vendor dashboard metrics
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

    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined

    const metrics = await VendorService.getVendorMetrics(id, year)

    return NextResponse.json({
      success: true,
      data: metrics,
    })
  } catch (error: any) {
    console.error('Error fetching vendor metrics:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch vendor metrics',
      },
      { status: 500 }
    )
  }
}

