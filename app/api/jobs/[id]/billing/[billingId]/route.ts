import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { BillingService } from '@/lib/billing/service'
import { updateBillingMilestoneSchema } from '@/lib/billing/schemas'
import { z } from 'zod'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; billingId: string }> | { id: string; billingId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    const billingMilestone = await BillingService.getBillingMilestoneById(resolvedParams.billingId)

    if (!billingMilestone) {
      return NextResponse.json({ error: 'Billing milestone not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: billingMilestone,
    })
  } catch (error: any) {
    console.error('Error fetching billing milestone:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch billing milestone' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; billingId: string }> | { id: string; billingId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    const body = await request.json()
    const validatedData = updateBillingMilestoneSchema.parse(body)

    const billingMilestone = await BillingService.updateBillingMilestone(resolvedParams.billingId, validatedData)

    return NextResponse.json({
      success: true,
      data: billingMilestone,
    })
  } catch (error: any) {
    console.error('Error updating billing milestone:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update billing milestone' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; billingId: string }> | { id: string; billingId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    await BillingService.deleteBillingMilestone(resolvedParams.billingId)

    return NextResponse.json({
      success: true,
      message: 'Billing milestone deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting billing milestone:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete billing milestone' },
      { status: 500 }
    )
  }
}


