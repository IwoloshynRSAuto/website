import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { AdminDashboard } from '@/components/manager/manager-dashboard'

export const dynamic = 'force-dynamic'

export default async function ManagerDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  // Check if user is admin or manager
  if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
    redirect('/dashboard/home')
  }

  const userId = session.user.id

  try {
    // Get direct reports if manager
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        directReports: {
          select: { id: true },
        },
      },
    })

    const subordinateIds = user?.directReports?.map(r => r.id) || []
    const isAdmin = session.user.role === 'ADMIN'

    // Fetch summary stats
    const [
      pendingTimesheets,
      pendingPTO,
      pendingExpenses,
      pendingTimeChanges,
      totalJobs,
      activeJobs,
    ] = await Promise.all([
      // Pending timesheets (submissions)
      prisma.timesheetSubmission.count({
        where: {
          status: 'SUBMITTED',
          ...(isAdmin ? {} : { userId: { in: subordinateIds } }),
        },
      }).catch(() => 0),
      // Pending PTO requests
      prisma.timeOffRequest.count({
        where: {
          status: 'PENDING',
          ...(isAdmin ? {} : { userId: { in: subordinateIds } }),
        },
      }).catch(() => 0),
      // Pending expense reports
      prisma.expenseReport.count({
        where: {
          status: 'SUBMITTED',
          ...(isAdmin ? {} : { userId: { in: subordinateIds } }),
        },
      }).catch(() => 0),
      // Pending time change requests
      prisma.timeChangeRequest.count({
        where: {
          status: 'PENDING',
          ...(isAdmin ? {} : { userId: { in: subordinateIds } }),
        },
      }).catch(() => 0),
      // Total jobs
      prisma.job.count({
        where: isAdmin ? {} : { assignedToId: { in: [userId, ...subordinateIds] } },
      }).catch(() => 0),
      // Active jobs
      prisma.job.count({
        where: {
          status: 'ACTIVE',
          ...(isAdmin ? {} : { assignedToId: { in: [userId, ...subordinateIds] } }),
        },
      }).catch(() => 0),
    ])

    const stats = {
      pendingTimesheets,
      pendingPTO,
      pendingExpenses,
      pendingTimeChanges,
      totalJobs,
      activeJobs,
      totalPending: pendingTimesheets + pendingPTO + pendingExpenses + pendingTimeChanges,
    }

    return <AdminDashboard stats={stats} />
  } catch (error) {
    console.error('Error loading admin dashboard:', error)
    return <AdminDashboard stats={{
      pendingTimesheets: 0,
      pendingPTO: 0,
      pendingExpenses: 0,
      pendingTimeChanges: 0,
      totalJobs: 0,
      activeJobs: 0,
      totalPending: 0,
    }} />
  }
}

