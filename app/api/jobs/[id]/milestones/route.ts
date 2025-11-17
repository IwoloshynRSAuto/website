import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { JobService } from '@/lib/jobs/service'
import { createJobMilestoneSchema, updateJobMilestoneSchema } from '@/lib/jobs/schemas'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/jobs/[id]/milestones
 * Get all milestones for a job
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Handle params - could be a Promise in Next.js 15+
    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams

    const milestones = await prisma.jobMilestone.findMany({
      where: { jobId: id },
      orderBy: { scheduledStartDate: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: milestones,
    })
  } catch (error: any) {
    console.error('Error fetching milestones:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch milestones',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/jobs/[id]/milestones
 * Create a new milestone for a job
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Handle params - could be a Promise in Next.js 15+
    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams

    const body = await request.json()
    const validatedData = createJobMilestoneSchema.parse({
      ...body,
      jobId: id,
    })

    // Use JobService to create milestone
    const milestone = await JobService.createMilestone(validatedData, session.user.id)

    return NextResponse.json(
      {
        success: true,
        data: milestone,
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
    console.error('Error creating milestone:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create milestone',
      },
      { status: 500 }
    )
  }
}

