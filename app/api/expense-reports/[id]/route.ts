import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { authorize } from '@/lib/auth/authorization'
import { z } from 'zod'

const submitExpenseSchema = z.object({
  action: z.enum(['submit', 'update', 'delete']).optional(),
})

// PATCH /api/expense-reports/[id] - Update or submit expense report
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
    const { action } = submitExpenseSchema.parse(body)

    const expense = await prisma.expenseReport.findUnique({
      where: { id },
    })

    if (!expense) {
      return NextResponse.json({ error: 'Expense report not found' }, { status: 404 })
    }

    // Users can only update their own expenses unless admin
    if (expense.userId !== session.user.id && !authorize(session.user, 'update', 'expense_report')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (action === 'submit' && expense.status === 'DRAFT') {
      const updated = await prisma.expenseReport.update({
        where: { id },
        data: {
          status: 'SUBMITTED',
          submittedAt: new Date(),
        },
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'SUBMIT',
          resourceType: 'EXPENSE_REPORT',
          resourceId: id,
        },
      })

      return NextResponse.json({ expense: updated })
    }

    return NextResponse.json({ expense })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error updating expense report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

