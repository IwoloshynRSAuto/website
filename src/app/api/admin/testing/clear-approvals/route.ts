import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const result = await prisma.$transaction(async (tx) => {
    const timesheetSubmissions = await tx.timesheetSubmission.updateMany({
      data: {
        status: 'DRAFT',
        submittedAt: null,
        approvedAt: null,
        approvedById: null,
        rejectedAt: null,
        rejectedById: null,
        rejectionReason: null,
      },
    })

    const timeChangeRequests = await tx.timeChangeRequest.updateMany({
      data: {
        status: 'PENDING',
        approvedAt: null,
        approvedById: null,
        rejectedAt: null,
        rejectedById: null,
        rejectionReason: null,
      },
    })

    const timeOffRequests = await tx.timeOffRequest.updateMany({
      data: {
        status: 'PENDING',
        approvedAt: null,
        approvedById: null,
        rejectedAt: null,
        rejectedById: null,
        rejectionReason: null,
      },
    })

    const expenseReports = await tx.expenseReport.updateMany({
      data: {
        status: 'DRAFT',
        submittedAt: null,
        approvedAt: null,
        approvedById: null,
        rejectedAt: null,
        rejectedById: null,
        rejectionReason: null,
        paidAt: null,
      },
    })

    return { timesheetSubmissions, timeChangeRequests, timeOffRequests, expenseReports }
  })

  return NextResponse.json({
    success: true,
    data: {
      timesheetSubmissionsReset: result.timesheetSubmissions.count,
      timeChangeRequestsReset: result.timeChangeRequests.count,
      timeOffRequestsReset: result.timeOffRequests.count,
      expenseReportsReset: result.expenseReports.count,
    },
  })
}

