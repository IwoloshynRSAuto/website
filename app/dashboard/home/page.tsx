import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PersonalizedHome } from '@/components/dashboard/personalized-home'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  const userId = session.user.id
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  try {
    // Get today's attendance
    const todayAttendanceRaw = await prisma.timesheet.findFirst({
      where: {
        userId: userId,
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: {
        clockInTime: 'desc',
      },
    }).catch(() => null)

    // Serialize dates to ISO strings to avoid hydration issues
    const todayAttendance = todayAttendanceRaw ? {
      ...todayAttendanceRaw,
      clockInTime: todayAttendanceRaw.clockInTime.toISOString(),
      clockOutTime: todayAttendanceRaw.clockOutTime ? todayAttendanceRaw.clockOutTime.toISOString() : null,
      date: todayAttendanceRaw.date.toISOString(),
    } : null

    // Get today's hours
    const todayTimeEntries = await prisma.timeEntry.findMany({
      where: {
        userId: userId,
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
    }).catch(() => [])

    const todayHours = todayTimeEntries.reduce(
      (sum, entry) => sum + (entry.regularHours || 0) + (entry.overtimeHours || 0),
      0
    )

    // Get pending approvals count (if user is a manager)
    let pendingApprovalsCount = 0
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          directReports: {
            select: { id: true },
          },
        },
      })

      if (user && user.directReports.length > 0) {
        const subordinateIds = user.directReports.map(r => r.id)
        const [ptoCount, expenseCount, timeChangeCount] = await Promise.all([
          prisma.timeOffRequest.count({
            where: {
              userId: { in: subordinateIds },
              status: 'PENDING',
            },
          }).catch(() => 0),
          prisma.expenseReport.count({
            where: {
              userId: { in: subordinateIds },
              status: 'SUBMITTED',
            },
          }).catch(() => 0),
          prisma.timeChangeRequest.count({
            where: {
              userId: { in: subordinateIds },
              status: 'PENDING',
            },
          }).catch(() => 0),
        ])
        pendingApprovalsCount = ptoCount + expenseCount + timeChangeCount
      }
    } catch (error) {
      // Ignore errors for pending approvals
    }

    // Get pending PTO requests
    const pendingPTO = await prisma.timeOffRequest.count({
      where: {
        userId: userId,
        status: 'PENDING',
      },
    }).catch(() => 0)

    // Fetch employee dashboard data
    const [
      assignedJobs,
      timeOffRequests,
      serviceReports,
      recentTimeEntries,
      recentAttendance,
      pendingExpenses
    ] = await Promise.all([
      // Assigned jobs
      prisma.job.findMany({
        where: {
          assignedToId: userId,
          status: { not: 'COMPLETED' }
        },
        include: {
          customer: {
            select: { name: true }
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
        where: { userId: userId },
        orderBy: { startDate: 'desc' },
        take: 10
      }).catch(() => []),
      // Service reports
      prisma.serviceReport.findMany({
        where: { userId: userId },
        include: {
          job: {
            select: {
              jobNumber: true,
              title: true,
              customer: {
                select: { name: true }
              }
            }
          }
        },
        orderBy: { reportDate: 'desc' },
        take: 10
      }).catch(() => []),
      // Recent time entries
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
        orderBy: { date: 'desc' },
        take: 20
      }).catch(() => []),
      // Recent attendance
      prisma.timesheet.findMany({
        where: {
          userId: userId,
          date: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        },
        orderBy: { date: 'desc' },
        take: 20
      }).catch(() => []),
      // Pending expenses
      prisma.expenseReport.findMany({
        where: {
          userId: userId,
          status: { in: ['DRAFT', 'SUBMITTED'] }
        },
        orderBy: { reportDate: 'desc' },
        take: 10
      }).catch(() => [])
    ])

    // Calculate weekly and monthly hours
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)
    
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const [weekTimeEntries, monthTimeEntries] = await Promise.all([
      prisma.timeEntry.findMany({
        where: {
          userId: userId,
          date: { gte: weekStart }
        }
      }).catch(() => []),
      prisma.timeEntry.findMany({
        where: {
          userId: userId,
          date: { gte: monthStart }
        }
      }).catch(() => [])
    ])

    const thisWeekHours = weekTimeEntries.reduce(
      (sum, entry) => sum + (entry.regularHours || 0) + (entry.overtimeHours || 0),
      0
    )

    const thisMonthHours = monthTimeEntries.reduce(
      (sum, entry) => sum + (entry.regularHours || 0) + (entry.overtimeHours || 0),
      0
    )

    // Transform data for dashboard
    const dashboardData = {
      stats: {
        thisWeekHours,
        thisMonthHours,
        assignedJobsCount: assignedJobs.length,
        pendingPTORequests: timeOffRequests.filter(r => r.status === 'PENDING').length,
        pendingExpensesCount: pendingExpenses.length
      },
      assignedJobs: assignedJobs.map(job => ({
        id: job.id,
        jobNumber: job.jobNumber,
        title: job.title,
        customerName: job.customer?.name || 'N/A',
        status: job.status,
        priority: job.priority,
        nextMilestone: job.milestones?.[0] || null
      })),
      timeOffRequests: timeOffRequests.map(req => ({
        id: req.id,
        requestType: req.requestType,
        startDate: req.startDate.toISOString(),
        endDate: req.endDate.toISOString(),
        status: req.status,
        hours: req.hours
      })),
      serviceReports: serviceReports.map(report => ({
        id: report.id,
        serviceType: report.serviceType,
        jobNumber: report.job.jobNumber,
        jobTitle: report.job.title,
        customerName: report.job.customer?.name || 'N/A',
        reportDate: report.reportDate.toISOString(),
        hoursWorked: report.hoursWorked
      })),
      recentTimeEntries: recentTimeEntries.map(entry => ({
        id: entry.id,
        jobNumber: entry.job?.jobNumber || 'N/A',
        jobTitle: entry.job?.title || 'N/A',
        date: entry.date.toISOString(),
        regularHours: entry.regularHours,
        overtimeHours: entry.overtimeHours,
        laborCode: entry.laborCode
      })),
      recentAttendance: recentAttendance.map(att => ({
        id: att.id,
        date: att.date.toISOString(),
        clockInTime: att.clockInTime.toISOString(),
        clockOutTime: att.clockOutTime ? att.clockOutTime.toISOString() : null,
        totalHours: att.totalHours
      })),
      pendingExpenses: pendingExpenses.map(exp => ({
        id: exp.id,
        description: exp.description,
        category: exp.category,
        amount: exp.amount,
        reportDate: exp.reportDate.toISOString(),
        status: exp.status
      }))
    }

    return (
      <PersonalizedHome
        userId={userId}
        userName={session.user.name || session.user.email || 'User'}
        todayAttendance={todayAttendance}
        todayHours={todayHours}
        pendingApprovalsCount={pendingApprovalsCount}
        pendingPTOCount={pendingPTO}
        userRole={session.user.role}
        dashboardData={dashboardData}
      />
    )
  } catch (error: any) {
    console.error('Error loading home dashboard:', error)
    return (
      <PersonalizedHome
        userId={userId}
        userName={session.user.name || session.user.email || 'User'}
        todayAttendance={null}
        todayHours={0}
        pendingApprovalsCount={0}
        pendingPTOCount={0}
        userRole={session.user.role}
        dashboardData={{
          stats: {
            thisWeekHours: 0,
            thisMonthHours: 0,
            assignedJobsCount: 0,
            pendingPTORequests: 0,
            pendingExpensesCount: 0
          },
          assignedJobs: [],
          timeOffRequests: [],
          serviceReports: [],
          recentTimeEntries: [],
          recentAttendance: [],
          pendingExpenses: []
        }}
      />
    )
  }
}

