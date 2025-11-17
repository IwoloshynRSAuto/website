import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { TimekeepingService } from '@/lib/timekeeping/service'
import { createTimeOffRequestSchema, timeOffRequestFilterSchema, updateTimeOffRequestSchema } from '@/lib/timekeeping/schemas'

/**
 * GET /api/timekeeping/time-off
 * Get time-off requests with filters
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
    const filters = timeOffRequestFilterSchema.parse({
      userId: searchParams.get('userId') || undefined,
      status: searchParams.get('status') || undefined,
      requestType: searchParams.get('requestType') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    })

    const requests = await TimekeepingService.getTimeOffRequests(filters)

    return NextResponse.json({
      success: true,
      data: requests,
    })
  } catch (error: any) {
    console.error('Error fetching time-off requests:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch time-off requests',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/timekeeping/time-off
 * Create a time-off request
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
    const validatedData = createTimeOffRequestSchema.parse(body)

    // Use userId from session if not provided
    const userId = validatedData.userId || session.user.id

    const request = await TimekeepingService.createTimeOffRequest(
      { ...validatedData, userId },
      session.user.id
    )

    return NextResponse.json(
      {
        success: true,
        data: request,
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
    console.error('Error creating time-off request:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create time-off request',
      },
      { status: 500 }
    )
  }
}

