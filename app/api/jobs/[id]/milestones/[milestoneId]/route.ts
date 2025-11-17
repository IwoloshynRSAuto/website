import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { JobService } from '@/lib/jobs/service'
import { updateJobMilestoneSchema } from '@/lib/jobs/schemas'
import { prisma } from '@/lib/prisma'

/**
 * PATCH /api/jobs/[id]/milestones/[milestoneId]
 * Update a milestone
 */
export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; milestoneId: string }> | { id: string; milestoneId: string }
  }
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
    const { milestoneId } = resolvedParams

    const body = await request.json()
    const validatedData = updateJobMilestoneSchema.partial().parse(body)

    // Use JobService to update milestone
    const milestone = await JobService.updateMilestone(milestoneId, validatedData)

    return NextResponse.json({
      success: true,
      data: milestone,
    })
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
    console.error('Error updating milestone:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update milestone',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/jobs/[id]/milestones/[milestoneId]
 * Delete a milestone
 */
export async function DELETE(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; milestoneId: string }> | { id: string; milestoneId: string }
  }
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
    const { milestoneId } = resolvedParams

    await prisma.jobMilestone.delete({
      where: { id: milestoneId },
    })

    return NextResponse.json({
      success: true,
      message: 'Milestone deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting milestone:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete milestone',
      },
      { status: 500 }
    )
  }
}

