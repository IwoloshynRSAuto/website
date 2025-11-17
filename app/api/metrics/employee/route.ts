import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { authorize } from '@/lib/auth/authorization'
import { EmployeeMetricsService } from '@/lib/metrics/employee-metrics'

// GET /api/metrics/employee - Get employee metrics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!authorize(session.user, 'read', 'analytics')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || session.user.id
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined

    // Users can only view their own metrics unless they're admin
    if (userId !== session.user.id && !authorize(session.user, 'read', 'user')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const filters = {
      userId,
      startDate,
      endDate,
      year,
      month,
    }

    const metrics = await EmployeeMetricsService.getEmployeeMetrics(userId, filters)

    return NextResponse.json({ success: true, data: metrics })
  } catch (error) {
    console.error('Error fetching employee metrics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

