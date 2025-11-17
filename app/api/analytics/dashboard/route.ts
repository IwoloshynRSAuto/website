import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AnalyticsService } from '@/lib/analytics/service'
import { analyticsFilterSchema } from '@/lib/analytics/schemas'

/**
 * GET /api/analytics/dashboard
 * Get comprehensive dashboard metrics (all metrics in one call)
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
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      userId: searchParams.get('userId') || undefined,
      jobId: searchParams.get('jobId') || undefined,
      customerId: searchParams.get('customerId') || undefined,
      year: searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined,
      month: searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined,
    })

    const metrics = await AnalyticsService.getDashboardMetrics(filters)

    return NextResponse.json({
      success: true,
      data: metrics,
    })
  } catch (error: any) {
    console.error('Error fetching dashboard metrics:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch dashboard metrics',
      },
      { status: 500 }
    )
  }
}

