import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { TimeView } from '@/components/timekeeping/time-view'
import { prisma } from '@/lib/prisma'

export default async function TimeTrackingPage() {
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

  const isAdmin = session.user.role === 'ADMIN'

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Time (Job Time Tracking)</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Track job-specific time entries</p>
      </div>

      <TimeView
        currentUserId={session.user.id}
        currentUserName={session.user.name || session.user.email || ''}
        users={users}
        jobs={jobs}
        laborCodes={laborCodes}
        isAdmin={isAdmin}
      />
    </div>
  )
}

