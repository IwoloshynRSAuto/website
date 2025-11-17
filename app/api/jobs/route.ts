import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { JobService } from '@/lib/jobs/service'
import { createJobSchema, jobFilterSchema } from '@/lib/jobs/schemas'

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
    const validatedData = createJobSchema.parse(body)

    // Use JobService to create job
    const job = await JobService.createJob(validatedData, session.user.id)

    // Convert Decimal fields to numbers for client compatibility
    const jobResponse = {
      ...job,
      estimatedHours: job.estimatedHours ? Number(job.estimatedHours) : null,
      actualHours: job.actualHours ? Number(job.actualHours) : null,
      estimatedCost: job.estimatedCost ? Number(job.estimatedCost) : null,
    }

    return NextResponse.json(
      {
        success: true,
        data: jobResponse,
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
    console.error('Error creating job:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create job',
      },
      { status: 500 }
    )
  }
}

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
    const filters = jobFilterSchema.parse({
      status: searchParams.get('status') || undefined,
      type: searchParams.get('type') || undefined,
      assignedToId: searchParams.get('assignedToId') || undefined,
      customerId: searchParams.get('customerId') || undefined,
      search: searchParams.get('search') || undefined,
      priority: searchParams.get('priority') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    })

    const jobs = await JobService.getJobs(filters)

    // Convert Decimal fields to numbers for client compatibility
    const jobsResponse = jobs.map((job) => ({
      ...job,
      estimatedHours: job.estimatedHours ? Number(job.estimatedHours) : null,
      actualHours: job.actualHours ? Number(job.actualHours) : null,
      estimatedCost: job.estimatedCost ? Number(job.estimatedCost) : null,
      dueTodayPercent: job.dueTodayPercent ? Number(job.dueTodayPercent) : null,
    }))

    return NextResponse.json({
      success: true,
      data: jobsResponse,
    })
  } catch (error: any) {
    console.error('Error fetching jobs:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch jobs',
      },
      { status: 500 }
    )
  }
}


