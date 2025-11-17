import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { DeliverableService } from '@/lib/deliverables/service'
import { createDeliverableSchema, deliverableFilterSchema } from '@/lib/deliverables/schemas'
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
    const filters = deliverableFilterSchema.parse({
      jobId,
      status: searchParams.get('status') || undefined,
      assignedToId: searchParams.get('assignedToId') || undefined,
      templateCode: searchParams.get('templateCode') || undefined,
      deliverableType: searchParams.get('deliverableType') || undefined,
    })

    const deliverables = await DeliverableService.getDeliverables(filters)

    return NextResponse.json({
      success: true,
      data: deliverables,
    })
  } catch (error: any) {
    console.error('Error fetching deliverables:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch deliverables' },
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
    const validatedData = createDeliverableSchema.parse({
      ...body,
      jobId, // Ensure jobId matches the route param
    })

    const deliverable = await DeliverableService.createDeliverable(validatedData, session.user.id)

    return NextResponse.json({
      success: true,
      data: deliverable,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating deliverable:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create deliverable' },
      { status: 500 }
    )
  }
}


