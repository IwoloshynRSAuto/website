import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * PATCH /api/quotes/[id]/milestones/[milestoneId]
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

    const resolvedParams = params instanceof Promise ? await params : params
    const { milestoneId } = resolvedParams

    const body = await request.json()
    const updateData: any = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.milestoneType !== undefined) updateData.milestoneType = body.milestoneType
    if (body.scheduledStartDate !== undefined) updateData.scheduledStartDate = body.scheduledStartDate ? new Date(body.scheduledStartDate) : null
    if (body.scheduledEndDate !== undefined) updateData.scheduledEndDate = body.scheduledEndDate ? new Date(body.scheduledEndDate) : null
    if (body.actualStartDate !== undefined) updateData.actualStartDate = body.actualStartDate ? new Date(body.actualStartDate) : null
    if (body.actualEndDate !== undefined) updateData.actualEndDate = body.actualEndDate ? new Date(body.actualEndDate) : null
    if (body.status !== undefined) updateData.status = body.status
    if (body.billingPercentage !== undefined) updateData.billingPercentage = body.billingPercentage ? parseFloat(body.billingPercentage) : null
    if (body.isBillingTrigger !== undefined) updateData.isBillingTrigger = body.isBillingTrigger

    const milestone = await prisma.quoteMilestone.update({
      where: { id: milestoneId },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      data: milestone
    })
  } catch (error: any) {
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
 * DELETE /api/quotes/[id]/milestones/[milestoneId]
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

    const resolvedParams = params instanceof Promise ? await params : params
    const { milestoneId } = resolvedParams

    await prisma.quoteMilestone.delete({
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


