import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateAgileStatusSchema = z.object({
  status: z.enum(['DRAFT', 'APPROVED', 'CANCELLED', 'SENT', 'WON', 'LOST']),
})

/**
 * PATCH /api/quotes/[id]/agile-status
 * Update quote status from agile board (dev-only endpoint)
 * This endpoint is more permissive than the regular status endpoint
 * for development/testing purposes
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      console.error('[PATCH /api/quotes/[id]/agile-status] Unauthorized request')
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams

    const body = await updateAgileStatusSchema.parse(await request.json())
    const { status } = body

    console.log('[PATCH /api/quotes/[id]/agile-status] Updating quote status from agile board:', {
      quoteId: id,
      newStatus: status,
      userId: session.user.id,
    })

    // Get the quote
    const quote = await prisma.quote.findUnique({
      where: { id },
      select: {
        id: true,
        quoteNumber: true,
        status: true,
        cancellationNote: true,
      },
    })

    if (!quote) {
      console.warn('[PATCH /api/quotes/[id]/agile-status] Quote not found:', id)
      return NextResponse.json(
        { success: false, error: 'Quote not found' },
        { status: 404 }
      )
    }

    const currentStatus = quote.status as string

    // Special validation for CANCELLED status
    // If moving to CANCELLED and no cancellation note exists, return error
    if (status === 'CANCELLED' && !quote.cancellationNote) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Quote requires cancellation note — open quote to cancel properly.',
          requiresCancellationNote: true,
        },
        { status: 400 }
      )
    }

    // Update the quote status
    const updated = await prisma.quote.update({
      where: { id },
      data: { status },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    console.log('[PATCH /api/quotes/[id]/agile-status] Quote status updated successfully:', {
      quoteId: id,
      oldStatus: currentStatus,
      newStatus: status,
    })

    // Create audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'STATUS_CHANGE_AGILE_DEV',
          resourceType: 'QUOTE',
          resourceId: id,
          details: {
            fromStatus: currentStatus,
            toStatus: status,
            source: 'AGILE_DEV_BOARD',
            quoteNumber: quote.quoteNumber,
          },
        },
      })
    } catch (auditError) {
      console.warn('[PATCH /api/quotes/[id]/agile-status] Failed to create audit log:', auditError)
      // Don't fail the request if audit log fails
    }

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error: any) {
    console.error('[PATCH /api/quotes/[id]/agile-status] Error updating quote status:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      name: error.name,
    })
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.issues,
        },
        { status: 400 }
      )
    }
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    )
  }
}

