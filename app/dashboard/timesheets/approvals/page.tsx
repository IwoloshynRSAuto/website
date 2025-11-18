import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { TimesheetApprovalsView } from '@/components/timekeeping/timesheet-approvals-view'

export default async function TimesheetApprovalsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  // Check if user is admin or manager
  if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
    redirect('/dashboard/timesheets/attendance')
  }

  const isAdmin = session.user.role === 'ADMIN'

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Timesheet Approvals</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Review and approve attendance, time entries, and change requests</p>
      </div>

      <TimesheetApprovalsView isAdmin={isAdmin} />
    </div>
  )
}


