import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { DeliverableService } from '@/lib/deliverables/service'
import { updateDeliverableSchema } from '@/lib/deliverables/schemas'
import { z } from 'zod'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; deliverableId: string }> | { id: string; deliverableId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    const deliverable = await DeliverableService.getDeliverableById(resolvedParams.deliverableId)

    if (!deliverable) {
      return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: deliverable,
    })
  } catch (error: any) {
    console.error('Error fetching deliverable:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch deliverable' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; deliverableId: string }> | { id: string; deliverableId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    const body = await request.json()
    const validatedData = updateDeliverableSchema.parse(body)

    const deliverable = await DeliverableService.updateDeliverable(resolvedParams.deliverableId, validatedData)

    return NextResponse.json({
      success: true,
      data: deliverable,
    })
  } catch (error: any) {
    console.error('Error updating deliverable:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update deliverable' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; deliverableId: string }> | { id: string; deliverableId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    await DeliverableService.deleteDeliverable(resolvedParams.deliverableId)

    return NextResponse.json({
      success: true,
      message: 'Deliverable deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting deliverable:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete deliverable' },
      { status: 500 }
    )
  }
}


