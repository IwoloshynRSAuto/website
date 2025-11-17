import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { authorize } from '@/lib/auth/authorization'
import { JobMetricsService } from '@/lib/metrics/job-metrics'

// GET /api/metrics/job - Get job metrics
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
    const jobId = searchParams.get('jobId')
    const customerId = searchParams.get('customerId') || undefined
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined

    if (jobId) {
      // Get metrics for a specific job
      const metrics = await JobMetricsService.getJobMetrics(jobId)
      return NextResponse.json({ success: true, data: metrics })
    } else {
      // Get metrics for all jobs
      const filters = {
        customerId,
        startDate,
        endDate,
        year,
        month,
      }
      const metrics = await JobMetricsService.getAllJobsMetrics(filters)
      return NextResponse.json({ success: true, data: metrics })
    }
  } catch (error) {
    console.error('Error fetching job metrics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

