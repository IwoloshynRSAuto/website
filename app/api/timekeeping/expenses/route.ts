import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { TimekeepingService } from '@/lib/timekeeping/service'
import { createExpenseReportSchema, expenseReportFilterSchema } from '@/lib/timekeeping/schemas'

/**
 * GET /api/timekeeping/expenses
 * Get expense reports with filters
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
    const filters = expenseReportFilterSchema.parse({
      userId: searchParams.get('userId') || undefined,
      status: searchParams.get('status') || undefined,
      category: searchParams.get('category') || undefined,
      jobId: searchParams.get('jobId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    })

    const reports = await TimekeepingService.getExpenseReports(filters)

    return NextResponse.json({
      success: true,
      data: reports,
    })
  } catch (error: any) {
    console.error('Error fetching expense reports:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch expense reports',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/timekeeping/expenses
 * Create an expense report
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
    const validatedData = createExpenseReportSchema.parse(body)

    // Use userId from session if not provided
    const userId = validatedData.userId || session.user.id

    const report = await TimekeepingService.createExpenseReport(
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
    console.error('Error creating expense report:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create expense report',
      },
      { status: 500 }
    )
  }
}

