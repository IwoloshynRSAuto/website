import { prisma } from '@/lib/prisma'
import { TimesheetApproval } from '@/components/timekeeping/timesheet-approval'
import { AdministratorWeekView } from '@/components/timekeeping/administrator-week-view'

export default async function TimekeepingAdministratorPage() {
  // Fetch users, jobs, and labor codes for the enhanced timesheet
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true
    },
    where: {
      isActive: true
    }
  })

  const jobs = await prisma.job.findMany({
    select: {
      id: true,
      jobNumber: true,
      title: true
    },
    where: {
      status: {
        not: 'COMPLETED'
      }
    }
  })

  const laborCodes = await prisma.laborCode.findMany({
    select: {
      id: true,
      code: true,
      description: true,
      hourlyRate: true
    },
    where: {
      isActive: true
    },
    orderBy: { code: 'asc' }
  })

  const laborCodesResponse = laborCodes.map(lc => ({
    ...lc,
    hourlyRate: Number(lc.hourlyRate)
  }))

  // Fetch timesheet submissions for approval
  const timesheetSubmissions = await prisma.timesheetSubmission.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      approvedBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      rejectedBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      timeEntries: {
        include: {
          job: {
            select: {
              id: true,
              jobNumber: true,
              title: true
            }
          },
          laborCode: {
            select: {
              id: true,
              code: true,
              description: true,
              hourlyRate: true
            }
          }
        }
      }
    },
    orderBy: { weekStart: 'desc' }
  })

  // Convert Decimal fields to numbers for client compatibility
  const submissionsResponse = timesheetSubmissions.map(submission => ({
    ...submission,
    user: {
      ...submission.user,
      name: submission.user.name ?? ''
    },
    approvedBy: submission.approvedBy ? {
      ...submission.approvedBy,
      name: submission.approvedBy.name ?? ''
    } : null,
    rejectedBy: submission.rejectedBy ? {
      ...submission.rejectedBy,
      name: submission.rejectedBy.name ?? ''
    } : null,
    // Convert Date fields to strings for client components
    weekStart: submission.weekStart.toISOString(),
    weekEnd: submission.weekEnd.toISOString(),
    submittedAt: submission.submittedAt ? submission.submittedAt.toISOString() : null,
    approvedAt: submission.approvedAt ? submission.approvedAt.toISOString() : null,
    rejectedAt: submission.rejectedAt ? submission.rejectedAt.toISOString() : null,
    createdAt: submission.createdAt.toISOString(),
    updatedAt: submission.updatedAt.toISOString(),
    timeEntries: submission.timeEntries.map(entry => ({
      ...entry,
      date: (entry.date as unknown as Date).toISOString(),
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      rate: entry.rate ? Number(entry.rate) : null,
      laborCode: entry.laborCode ? {
        ...entry.laborCode,
        description: entry.laborCode.description ?? '',
        hourlyRate: Number(entry.laborCode.hourlyRate)
      } : null
    }))
  }))

  // Calculate admin stats
  const totalSubmissions = submissionsResponse.length
  const pendingSubmissions = submissionsResponse.filter(s => s.status === 'SUBMITTED').length
  const totalHours = submissionsResponse.reduce((sum, submission) => 
    sum + submission.timeEntries.reduce((entrySum, entry) => 
      entrySum + entry.regularHours + entry.overtimeHours, 0), 0)
  
  const totalValue = submissionsResponse.reduce((sum, submission) => 
    sum + submission.timeEntries
      .filter(entry => entry.rate)
      .reduce((entrySum, entry) => 
        entrySum + ((entry.regularHours + entry.overtimeHours) * (entry.rate || 0)), 0), 0)

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Timekeeping Administrator</h1>
          <p className="text-gray-600">Manage timesheet submissions, approvals, and administrative functions</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <span>Last updated: {new Date().toLocaleString()}</span>
        </div>
      </div>

      {/* Admin Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Submissions</p>
              <p className="text-2xl font-bold text-gray-900">{totalSubmissions}</p>
            </div>
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Review</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingSubmissions}</p>
            </div>
            <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Hours</p>
              <p className="text-2xl font-bold text-gray-900">{totalHours.toFixed(1)}h</p>
            </div>
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">${totalValue.toFixed(2)}</p>
            </div>
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Week Summary View */}
      <AdministratorWeekView submissions={submissionsResponse} />

      {/* Timesheet Approval */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-6">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <h2 className="text-xl font-semibold text-gray-900">Timesheet Approval</h2>
        </div>
        <p className="text-sm text-gray-600 mb-6">Review and approve submitted timesheets</p>
        <TimesheetApproval submissions={submissionsResponse} />
      </div>
    </div>
  )
}
