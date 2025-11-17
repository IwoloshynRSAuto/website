import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { authorize } from '@/lib/auth/authorization'
import { ExpenseApprovalsPage } from '@/components/approvals/expense-approvals-page'

export default async function ExpenseApprovalsPageRoute() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  // Check if user can approve (manager or admin)
  if (!authorize(session.user, 'approve', 'expense_report')) {
    redirect('/dashboard/home')
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Expense Approvals</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Review and approve expense reports</p>
      </div>

      <ExpenseApprovalsPage />
    </div>
  )
}

