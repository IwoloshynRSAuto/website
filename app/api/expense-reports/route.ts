import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { authorize } from '@/lib/auth/authorization'
import { z } from 'zod'

const expenseReportSchema = z.object({
  userId: z.string(),
  reportDate: z.string().or(z.date()),
  description: z.string().min(1),
  amount: z.number().min(0),
  category: z.enum(['TRAVEL', 'MEALS', 'SUPPLIES', 'EQUIPMENT', 'OTHER']),
  jobId: z.string().optional().nullable(),
  receiptFileId: z.string().optional().nullable(),
})

// GET /api/expense-reports - List expense reports
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')

    const where: any = {}
    if (userId) {
      // Users can only see their own expenses unless they're admin/manager
      if (userId !== session.user.id && !authorize(session.user, 'read', 'expense_report')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      where.userId = userId
    } else if (!authorize(session.user, 'read', 'expense_report')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (status) {
      where.status = status
    }

    const expenses = await prisma.expenseReport.findMany({
      where,
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
      orderBy: { reportDate: 'desc' },
    })

    return NextResponse.json({ expenses })
  } catch (error) {
    console.error('Error fetching expense reports:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/expense-reports - Create expense report
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!authorize(session.user, 'create', 'expense_report')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const data = expenseReportSchema.parse(body)

    // Users can only create expenses for themselves unless admin
    if (data.userId !== session.user.id && !authorize(session.user, 'create', 'user')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const reportDate = typeof data.reportDate === 'string' ? new Date(data.reportDate) : data.reportDate

    const expenseReport = await prisma.expenseReport.create({
      data: {
        userId: data.userId,
        reportDate,
        description: data.description,
        amount: data.amount,
        category: data.category,
        jobId: data.jobId || null,
        receiptFileId: data.receiptFileId || null,
        status: 'DRAFT',
      },
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
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        resourceType: 'EXPENSE_REPORT',
        resourceId: expenseReport.id,
        details: {
          amount: data.amount,
          category: data.category,
        },
      },
    })

    return NextResponse.json({ expense: expenseReport }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error creating expense report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

