import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { TimekeepingService } from '@/lib/timekeeping/service'
import { createServiceReportSchema, updateServiceReportSchema } from '@/lib/timekeeping/schemas'

/**
 * GET /api/timekeeping/service-reports
 * Get service reports for a job
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
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'Job ID is required' },
        { status: 400 }
      )
    }

    const reports = await TimekeepingService.getServiceReports(jobId)

    return NextResponse.json({
      success: true,
      data: reports,
    })
  } catch (error: any) {
    console.error('Error fetching service reports:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch service reports',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/timekeeping/service-reports
 * Create a service report
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
    const validatedData = createServiceReportSchema.parse(body)

    // Use userId from session if not provided
    const userId = validatedData.userId || session.user.id

    const report = await TimekeepingService.createServiceReport(
      { ...validatedData, userId },
      session.user.id
    )

    return NextResponse.json(
      {
        success: true,
        data: report,
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
    console.error('Error creating service report:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create service report',
      },
      { status: 500 }
    )
  }
}

