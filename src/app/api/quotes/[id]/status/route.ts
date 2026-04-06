import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateStatusSchema = z.object({
  status: z.enum(['DRAFT', 'APPROVED', 'CANCELLED']),
})

// PATCH /api/quotes/[id]/status - Update quote status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      console.error('[PATCH /api/quotes/[id]/status] Unauthorized request')
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams

    const body = await request.json()
    const { status } = updateStatusSchema.parse(body)

    console.log('[PATCH /api/quotes/[id]/status] Updating quote status:', {
      quoteId: id,
      newStatus: status,
      userId: session.user.id,
    })

    // Check if quote exists
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
        job: {
          select: {
            id: true,
            jobNumber: true,
          },
        },
      },
    })

    if (!quote) {
      console.warn('[PATCH /api/quotes/[id]/status] Quote not found:', id)
      return NextResponse.json(
        { success: false, error: 'Quote not found' },
        { status: 404 }
      )
    }

    // Check if quote is already converted to a job (if trying to approve)
    if (status === 'APPROVED' && quote.job) {
      console.warn('[PATCH /api/quotes/[id]/status] Quote already converted to job:', {
        quoteId: id,
        jobId: quote.job.id,
      })
      return NextResponse.json(
        { success: false, error: 'Quote has already been converted to a job' },
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
        linkedBOMs: {
          select: {
            id: true,
            name: true,
          },
        },
        job: {
          select: {
            id: true,
            jobNumber: true,
            title: true,
          },
        },
        _count: {
          select: {
            fileRecords: true,
          },
        },
      },
    })

    console.log('[PATCH /api/quotes/[id]/status] Quote status updated successfully:', {
      quoteId: id,
      newStatus: status,
    })

    // Create audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'UPDATE',
          resourceType: 'QUOTE',
          resourceId: id,
          details: {
            field: 'status',
            oldValue: quote.status,
            newValue: status,
          },
        },
      })
    } catch (auditError) {
      console.warn('[PATCH /api/quotes/[id]/status] Failed to create audit log:', auditError)
      // Don't fail the request if audit log fails
    }

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error: any) {
    console.error('[PATCH /api/quotes/[id]/status] Error updating quote status:', {
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
          details: error.errors,
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

