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

// PATCH /api/approvals/expense/[id] - Approve or reject expense report
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

    const expenseReport = await prisma.expenseReport.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            manager: true,
          },
        },
        job: {
          select: {
            id: true,
            jobNumber: true,
            title: true,
          },
        },
      },
    })

    if (!expenseReport) {
      return NextResponse.json({ error: 'Expense report not found' }, { status: 404 })
    }

    // Check if user is the manager of the requester or is admin
    const isManager = expenseReport.user.managerId === session.user.id
    const isAdmin = authorize(session.user, 'approve', 'expense_report')

    if (!isManager && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (expenseReport.status !== 'SUBMITTED') {
      return NextResponse.json({ error: 'Expense report already processed' }, { status: 400 })
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

    const updated = await prisma.expenseReport.update({
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
        job: {
          select: {
            id: true,
            jobNumber: true,
            title: true,
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
        resourceType: 'EXPENSE_REPORT',
        resourceId: id,
        details: {
          employeeId: expenseReport.userId,
          amount: expenseReport.amount,
          action,
          rejectionReason: action === 'reject' ? rejectionReason : null,
        },
      },
    })

    return NextResponse.json({ expense: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error processing approval:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

