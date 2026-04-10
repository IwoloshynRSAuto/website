import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { TimesheetMainWrapper } from '@/components/timekeeping/timesheet-main-wrapper'
import { prisma } from '@/lib/prisma'
import { isAdmin, type User as AuthUser } from '@/lib/auth/authorization'

export default async function TimekeepingPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  // Fetch users (for admin selection)
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: { name: 'asc' }
  })

  // Fetch jobs
  const jobs = await prisma.job.findMany({
    where: {
      status: { not: 'COMPLETED' }
    },
    select: {
      id: true,
      jobNumber: true,
      title: true,
    },
    orderBy: { jobNumber: 'asc' }
  })

  // Fetch labor codes
  const laborCodes = await prisma.laborCode.findMany({
    where: { isActive: true },
    select: {
      id: true,
      code: true,
      name: true,
    },
    orderBy: { code: 'asc' }
  })

  const userIsAdmin = session.user.role === 'ADMIN'
  const canViewApprovalsTab = isAdmin(session.user as AuthUser)

  return (
    <TimesheetMainWrapper
        currentUserId={session.user.id}
        currentUserName={session.user.name || session.user.email || ''}
        users={users}
      jobs={jobs}
      laborCodes={laborCodes}
        isAdmin={userIsAdmin}
        canViewApprovalsTab={canViewApprovalsTab}
      />
  )
}
