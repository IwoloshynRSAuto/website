import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { BillingService } from '@/lib/billing/service'
import { createBillingMilestoneSchema, billingFilterSchema } from '@/lib/billing/schemas'
import { z } from 'zod'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    const jobId = resolvedParams.id

    const { searchParams } = new URL(request.url)
    const filters = billingFilterSchema.parse({
      jobId,
      status: searchParams.get('status') || undefined,
      milestoneId: searchParams.get('milestoneId') || undefined,
    })

    const billingMilestones = await BillingService.getBillingMilestones(filters)

    // If summary is requested, return billing summary
    if (searchParams.get('summary') === 'true') {
      const summary = await BillingService.getJobBillingSummary(jobId)
      return NextResponse.json({
        success: true,
        data: summary,
      })
    }

    return NextResponse.json({
      success: true,
      data: billingMilestones,
    })
  } catch (error: any) {
    console.error('Error fetching billing milestones:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch billing milestones' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    const jobId = resolvedParams.id

    const body = await request.json()
    const validatedData = createBillingMilestoneSchema.parse({
      ...body,
      jobId, // Ensure jobId matches the route param
    })

    const billingMilestone = await BillingService.createBillingMilestone(validatedData, session.user.id)

    return NextResponse.json({
      success: true,
      data: billingMilestone,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating billing milestone:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create billing milestone' },
      { status: 500 }
    )
  }
}


