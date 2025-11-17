import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AnalyticsService } from '@/lib/analytics/service'
import { analyticsFilterSchema } from '@/lib/analytics/schemas'

/**
 * GET /api/analytics/bom-variance
 * Get BOM variance metrics
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
    const filters = analyticsFilterSchema.parse({
      jobId: searchParams.get('jobId') || undefined,
    })

    const metrics = await AnalyticsService.getBOMVariance(filters)

    return NextResponse.json({
      success: true,
      data: metrics,
    })
  } catch (error: any) {
    console.error('Error fetching BOM variance metrics:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch BOM variance metrics',
      },
      { status: 500 }
    )
  }
}

