import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { authorize } from '@/lib/auth/authorization'
import { PTOApprovalsPage } from '@/components/approvals/pto-approvals-page'

export default async function PTOApprovalsPageRoute() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  // Check if user can approve (manager or admin)
  if (!authorize(session.user, 'approve', 'time_off_request')) {
    redirect('/dashboard/home')
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">PTO Approvals</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Review and approve time off requests</p>
      </div>

      <PTOApprovalsPage />
    </div>
  )
}

