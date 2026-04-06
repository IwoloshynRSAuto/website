import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { TimeChangeApprovals } from '@/components/timekeeping/time-change-approvals'
import { DashboardPageShell } from '@/components/layout/dashboard-page-shell'

export default async function TimeChangeApprovalsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  // Check if user is admin or manager
  if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
    redirect('/dashboard/timekeeping')
  }

  return (
    <DashboardPageShell
      title="Attendance Change Approvals"
      description="Review and approve attendance change requests from employees"
    >
      <TimeChangeApprovals />
    </DashboardPageShell>
  )
}

