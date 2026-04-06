import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/quotes/[id]/milestones
 * Get all milestones for a quote
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

    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams

    const milestones = await prisma.quoteMilestone.findMany({
      where: { quoteId: id },
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
 * POST /api/quotes/[id]/milestones
 * Create a new milestone for a quote
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

    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams

    const body = await request.json()
    const { name, description, milestoneType, scheduledStartDate, scheduledEndDate, billingPercentage, isBillingTrigger } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      )
    }

    const milestone = await prisma.quoteMilestone.create({
      data: {
        quoteId: id,
        name,
        description: description || null,
        milestoneType: milestoneType || 'OTHER',
        scheduledStartDate: scheduledStartDate ? new Date(scheduledStartDate) : null,
        scheduledEndDate: scheduledEndDate ? new Date(scheduledEndDate) : null,
        billingPercentage: billingPercentage ? parseFloat(billingPercentage) : null,
        isBillingTrigger: isBillingTrigger || false,
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: milestone,
      },
      { status: 201 }
    )
  } catch (error: any) {
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


