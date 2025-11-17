import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { JobService } from '@/lib/jobs/service'
import { convertQuoteToJobSchema } from '@/lib/jobs/schemas'

/**
 * POST /api/jobs/convert
 * Convert a quote to a job
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
    const validatedData = convertQuoteToJobSchema.parse(body)

    // Use JobService to convert quote to job
    const job = await JobService.convertQuoteToJob(validatedData, session.user.id)

    return NextResponse.json(
      {
        success: true,
        data: job,
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
    console.error('Error converting quote to job:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to convert quote to job',
      },
      { status: 500 }
    )
  }
}

