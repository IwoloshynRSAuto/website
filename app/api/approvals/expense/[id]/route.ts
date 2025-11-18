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

    console.log('[PATCH /api/approvals/expense/[id]] Updating expense report:', {
      id,
      action,
      updateData,
      approverId: session.user.id,
    })

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
        receiptFile: {
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            storagePath: true,
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

    console.log('[PATCH /api/approvals/expense/[id]] Expense report updated successfully:', updated.id)

    // Create audit log (wrapped in try-catch to not fail if audit log fails)
    try {
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
    } catch (auditError) {
      console.warn('[PATCH /api/approvals/expense/[id]] Failed to create audit log:', auditError)
      // Don't fail the request if audit log fails
    }

    return NextResponse.json({ 
      success: true,
      expense: updated 
    })
  } catch (error: any) {
    console.error('[PATCH /api/approvals/expense/[id]] Error processing approval:', {
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

