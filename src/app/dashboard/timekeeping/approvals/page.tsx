import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { WeeklyApprovalsDashboard } from '@modules/timekeeping/ui/weekly-approvals-dashboard'
import { isAdmin } from '@/lib/auth/authorization'
import { DashboardPageShell } from '@/components/layout/dashboard-page-shell'

export default async function ApprovalsDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  if (!isAdmin(session.user)) {
    redirect('/dashboard/timekeeping/attendance')
  }

  return (
    <DashboardPageShell
      title="Approvals"
      description="See submission status for every employee by week."
    >
      <WeeklyApprovalsDashboard />
    </DashboardPageShell>
  )
}

