import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { authorize } from '@/lib/auth/authorization'
import { z } from 'zod'

const approveSchema = z.object({
  action: z.enum(['approve', 'reject']),
  rejectionReason: z.string().optional(),
})

// PATCH /api/approvals/time-off/[id] - Approve or reject time off request
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { action, rejectionReason } = approveSchema.parse(body)

    const timeOffRequest = await prisma.timeOffRequest.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            manager: true,
          },
        },
      },
    })

    if (!timeOffRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Check if user is the manager of the requester or is admin
    const isManager = timeOffRequest.user.managerId === session.user.id
    const isAdmin = authorize(session.user, 'approve', 'time_off_request')

    if (!isManager && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (timeOffRequest.status !== 'PENDING') {
      return NextResponse.json({ error: 'Request already processed' }, { status: 400 })
    }

    const updateData: any = {}
    if (action === 'approve') {
      updateData.status = 'APPROVED'
      updateData.approvedAt = new Date()
      updateData.approvedById = session.user.id
    } else {
      updateData.status = 'REJECTED'
      updateData.rejectedAt = new Date()
      updateData.rejectedById = session.user.id
      updateData.rejectionReason = rejectionReason || 'No reason provided'
    }

    console.log('[PATCH /api/approvals/time-off/[id]] Updating time off request:', {
      id,
      action,
      updateData,
      approverId: session.user.id,
    })

    const updated = await prisma.timeOffRequest.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
          },
        },
        rejectedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    console.log('[PATCH /api/approvals/time-off/[id]] Time off request updated successfully:', updated.id)

    // Create audit log (wrapped in try-catch to not fail if audit log fails)
    try {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: action === 'approve' ? 'APPROVE' : 'REJECT',
          resourceType: 'TIME_OFF_REQUEST',
          resourceId: id,
          details: {
            employeeId: timeOffRequest.userId,
            action,
            rejectionReason: action === 'reject' ? rejectionReason : null,
          },
        },
      })
    } catch (auditError) {
      console.warn('[PATCH /api/approvals/time-off/[id]] Failed to create audit log:', auditError)
      // Don't fail the request if audit log fails
    }

    return NextResponse.json({ 
      success: true,
      request: updated 
    })
  } catch (error: any) {
    console.error('[PATCH /api/approvals/time-off/[id]] Error processing approval:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      name: error.name,
    })
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        success: false,
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Internal server error' 
    }, { status: 500 })
  }
}

