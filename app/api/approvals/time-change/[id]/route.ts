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

// PATCH /api/approvals/time-change/[id] - Approve or reject time change request
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

    const timeChangeRequest = await prisma.timeChangeRequest.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            manager: true,
          },
        },
        timesheet: {
          select: {
            id: true,
            date: true,
            clockInTime: true,
            clockOutTime: true,
          },
        },
      },
    })

    if (!timeChangeRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Check if user is the manager of the requester or is admin
    const isManager = timeChangeRequest.user.managerId === session.user.id
    const isAdmin = authorize(session.user, 'approve', 'time_entry')

    if (!isManager && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (timeChangeRequest.status !== 'PENDING') {
      return NextResponse.json({ error: 'Request already processed' }, { status: 400 })
    }

    const updateData: any = {}
    if (action === 'approve') {
      updateData.status = 'APPROVED'
      updateData.approvedAt = new Date()
      updateData.approvedById = session.user.id

      // Update the timesheet if it exists
      if (timeChangeRequest.timesheetId) {
        await prisma.timesheet.update({
          where: { id: timeChangeRequest.timesheetId },
          data: {
            clockInTime: timeChangeRequest.requestedClockInTime,
            clockOutTime: timeChangeRequest.requestedClockOutTime || null,
          },
        })
      }
    } else {
      updateData.status = 'REJECTED'
      updateData.rejectedAt = new Date()
      updateData.rejectedById = session.user.id
      updateData.rejectionReason = rejectionReason || 'No reason provided'
    }

    const updated = await prisma.timeChangeRequest.update({
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
        timesheet: {
          select: {
            id: true,
            date: true,
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

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: action === 'approve' ? 'APPROVE' : 'REJECT',
        resourceType: 'TIME_CHANGE_REQUEST',
        resourceId: id,
        details: {
          employeeId: timeChangeRequest.userId,
          action,
          rejectionReason: action === 'reject' ? rejectionReason : null,
        },
      },
    })

    return NextResponse.json({ request: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error processing approval:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

