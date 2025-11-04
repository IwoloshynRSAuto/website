import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CreateTimeEntryButton } from '@/components/timekeeping/create-time-entry-button'
import { TimekeepingStats } from '@/components/timekeeping/timekeeping-stats'
import { EnhancedTimesheetView } from '@/components/timekeeping/enhanced-timesheet-view'
import { TimesheetSOPModal } from '@/components/timekeeping/timesheet-sop-modal'

export default async function TimekeepingPage() {
  const session = await getServerSession(authOptions)

  // Fetch users, jobs, and labor codes for the enhanced timesheet
  const usersRaw = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true
    },
    where: {
      isActive: true
    }
  })
  const users = usersRaw.map(u => ({ ...u, name: u.name ?? '' }))

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
    },
    orderBy: { jobNumber: 'desc' }
  })

  const laborCodes = await prisma.laborCode.findMany({
    select: {
      id: true,
      code: true,
      name: true,
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
    description: lc.description ?? '',
    hourlyRate: Number(lc.hourlyRate)
  }))

  // Calculate basic stats (simplified for main page)
  const totalHours = 0 // Will be calculated from submissions in admin page
  const billableHours = 0
  const totalValue = 0
  const uniqueUsers = users.length

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Timekeeping</h1>
          <p className="text-sm sm:text-base text-gray-600">Track time entries, labor codes, and billable hours</p>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <TimekeepingStats
          totalHours={totalHours}
          billableHours={billableHours}
          totalValue={totalValue}
          uniqueUsers={uniqueUsers}
        />
      </div>

      {/* Timesheet View */}
      <div className="mt-8">
        <EnhancedTimesheetView 
          users={users}
          jobs={jobs}
          laborCodes={laborCodesResponse}
          currentUserId={session?.user?.id}
          isAdmin={session?.user?.role === 'ADMIN'}
          headerButtons={
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <TimesheetSOPModal />
              <CreateTimeEntryButton />
            </div>
          }
        />
      </div>
    </div>
  )
}
