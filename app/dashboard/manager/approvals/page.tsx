import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ManagerApprovalsDashboard } from '@/components/employee/manager-approvals-dashboard'
import { authorize } from '@/lib/auth/authorization'

export default async function ManagerApprovalsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  // Check if user can approve (manager or admin)
  if (!authorize(session.user, 'approve', 'time_off_request')) {
    redirect('/dashboard')
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Approvals Dashboard</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Review and approve requests from your team</p>
      </div>

      <ManagerApprovalsDashboard />
    </div>
  )
}

