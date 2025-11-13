import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { TimeChangeApprovals } from '@/components/timekeeping/time-change-approvals'

export default async function TimeChangeApprovalsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  // Only admins can access this page
  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard/timekeeping')
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Attendance Change Approvals</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Review and approve attendance change requests from employees</p>
      </div>

      <TimeChangeApprovals />
    </div>
  )
}

