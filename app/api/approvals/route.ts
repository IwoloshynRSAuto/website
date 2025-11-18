import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { authorize } from '@/lib/auth/authorization'

// GET /api/approvals - Get pending approvals for current user (manager)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        directReports: {
          select: { id: true },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const subordinateIds = user.directReports.map(r => r.id)
    const isAdmin = authorize(session.user, 'approve', 'time_off_request')

    // If admin, get all approvals; otherwise only from subordinates
    const timeOffWhere = isAdmin
      ? {}
      : { userId: { in: subordinateIds } }
    
    const expenseWhere = isAdmin
      ? {}
      : { userId: { in: subordinateIds } }
    
    const timeChangeWhere = isAdmin
      ? {}
      : { userId: { in: subordinateIds } }

    const [timeOffRequests, expenseReports, timeChangeRequests] = await Promise.all([
      prisma.timeOffRequest.findMany({
        where: timeOffWhere,
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
        orderBy: { submittedAt: 'desc' },
      }),
      prisma.expenseReport.findMany({
        where: expenseWhere,
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
        orderBy: { submittedAt: 'desc' },
      }),
      prisma.timeChangeRequest.findMany({
        where: timeChangeWhere,
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
        },
        orderBy: { submittedAt: 'desc' },
      }),
    ])

    return NextResponse.json({
      timeOffRequests,
      expenseReports,
      timeChangeRequests,
      summary: {
        totalPending: timeOffRequests.length + expenseReports.length + timeChangeRequests.length,
        timeOffCount: timeOffRequests.length,
        expenseCount: expenseReports.length,
        timeChangeCount: timeChangeRequests.length,
      },
    })
  } catch (error) {
    console.error('Error fetching approvals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

