import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AnalyticsService } from '@/lib/analytics/service'
import { analyticsFilterSchema } from '@/lib/analytics/schemas'

/**
 * GET /api/analytics/win-loss
 * Get win/loss rate metrics
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
      customerId: searchParams.get('customerId') || undefined,
      year: searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined,
      month: searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined,
    })

    const metrics = await AnalyticsService.getWinLossRate(filters)

    return NextResponse.json({
      success: true,
      data: metrics,
    })
  } catch (error: any) {
    console.error('Error fetching win/loss metrics:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch win/loss metrics',
      },
      { status: 500 }
    )
  }
}

