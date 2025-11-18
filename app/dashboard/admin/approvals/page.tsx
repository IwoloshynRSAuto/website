import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminApprovalsView } from '@/components/admin/admin-approvals-view'

export const dynamic = 'force-dynamic'

export default async function AdminApprovalsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  // Check if user is admin
  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard/home')
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Approvals</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          Review and approve time off requests, expense reports, and time change requests
        </p>
      </div>

      <AdminApprovalsView />
    </div>
  )
}

