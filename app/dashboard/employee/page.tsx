import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { EmployeeDashboard } from '@/components/employee/employee-dashboard'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function EmployeeDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  const userId = session.user.id

  // Fetch employee data
  const [
    assignedJobs,
    timeOffRequests,
    serviceReports,
    recentTimeEntries,
    recentAttendance,
    pendingExpenses
  ] = await Promise.all([
    // Assigned jobs (tasks)
    prisma.job.findMany({
      where: {
        assignedToId: userId,
        status: { not: 'COMPLETED' }
      },
      include: {
        customer: {
          select: {
            name: true
          }
        },
        milestones: {
          where: {
            status: { not: 'COMPLETED' }
          },
          orderBy: {
            scheduledStartDate: 'asc'
          },
          take: 3
        }
      },
      orderBy: {
        priority: 'desc'
      },
      take: 10
    }),
    // PTO requests
    prisma.timeOffRequest.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        startDate: 'desc'
      },
      take: 10
    }),
    // Service reports (site visits)
    prisma.serviceReport.findMany({
      where: {
        userId: userId
      },
      include: {
        job: {
          select: {
            jobNumber: true,
            title: true,
            customer: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        reportDate: 'desc'
      },
      take: 10
    }),
    // Recent time entries (last 7 days)
    prisma.timeEntry.findMany({
      where: {
        userId: userId,
        date: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      include: {
        job: {
          select: {
            jobNumber: true,
            title: true
          }
        },
        laborCode: {
          select: {
            code: true,
            name: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      },
      take: 20
    }),
    // Recent attendance (last 7 days)
    prisma.timesheet.findMany({
      where: {
        userId: userId,
        date: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      orderBy: {
        date: 'desc'
      },
      take: 20
    }),
    // Pending expense reports
    prisma.expenseReport.findMany({
      where: {
        userId: userId,
        status: { in: ['DRAFT', 'SUBMITTED'] }
      },
      orderBy: {
        reportDate: 'desc'
      },
      take: 10
    })
  ])

  // Calculate presence stats
  const today = new Date()
  const thisWeekStart = new Date(today)
  thisWeekStart.setDate(today.getDate() - today.getDay()) // Sunday
  thisWeekStart.setHours(0, 0, 0, 0)

  const thisWeekHours = recentTimeEntries
    .filter(te => new Date(te.date) >= thisWeekStart)
    .reduce((sum, te) => sum + (te.regularHours || 0) + (te.overtimeHours || 0), 0)

  const thisMonthHours = recentTimeEntries
    .filter(te => {
      const entryDate = new Date(te.date)
      return entryDate.getMonth() === today.getMonth() && entryDate.getFullYear() === today.getFullYear()
    })
    .reduce((sum, te) => sum + (te.regularHours || 0) + (te.overtimeHours || 0), 0)

  // Format data for component
  const dashboardData = {
    assignedJobs: assignedJobs.map(job => ({
      id: job.id,
      jobNumber: job.jobNumber,
      title: job.title,
      customerName: job.customer?.name || 'N/A',
      status: job.status,
      priority: job.priority,
      endDate: job.endDate?.toISOString() || null,
      nextMilestone: job.milestones[0] ? {
        name: job.milestones[0].name,
        scheduledStartDate: job.milestones[0].scheduledStartDate?.toISOString() || null,
        status: job.milestones[0].status
      } : null
    })),
    timeOffRequests: timeOffRequests.map(req => ({
      id: req.id,
      startDate: req.startDate.toISOString(),
      endDate: req.endDate.toISOString(),
      requestType: req.requestType,
      status: req.status,
      hours: req.hours || null,
      reason: req.reason || null
    })),
    serviceReports: serviceReports.map(report => ({
      id: report.id,
      reportDate: report.reportDate.toISOString(),
      serviceType: report.serviceType,
      description: report.description,
      jobNumber: report.job.jobNumber,
      jobTitle: report.job.title,
      customerName: report.job.customer?.name || 'N/A',
      hoursWorked: report.hoursWorked || null
    })),
    recentTimeEntries: recentTimeEntries.map(entry => ({
      id: entry.id,
      date: entry.date.toISOString(),
      regularHours: entry.regularHours,
      overtimeHours: entry.overtimeHours,
      jobNumber: entry.job.jobNumber,
      jobTitle: entry.job.title,
      laborCode: entry.laborCode ? {
        code: entry.laborCode.code,
        name: entry.laborCode.name
      } : null
    })),
    recentAttendance: recentAttendance.map(att => ({
      id: att.id,
      date: att.date.toISOString(),
      clockInTime: att.clockInTime.toISOString(),
      clockOutTime: att.clockOutTime?.toISOString() || null,
      totalHours: att.totalHours || null,
      status: att.status
    })),
    pendingExpenses: pendingExpenses.map(exp => ({
      id: exp.id,
      reportDate: exp.reportDate.toISOString(),
      description: exp.description,
      amount: exp.amount,
      category: exp.category,
      status: exp.status
    })),
    stats: {
      thisWeekHours,
      thisMonthHours,
      assignedJobsCount: assignedJobs.length,
      pendingPTORequests: timeOffRequests.filter(r => r.status === 'PENDING').length,
      pendingExpensesCount: pendingExpenses.length
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Employee Dashboard</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          Your tasks, time off, site visits, and time tracking overview
        </p>
      </div>

      <EmployeeDashboard data={dashboardData} />
    </div>
  )
}


