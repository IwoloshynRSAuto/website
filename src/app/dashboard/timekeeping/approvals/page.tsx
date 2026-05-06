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
      description="Review weekly sheets and approve or reject attendance and job-time submissions."
      howTo={{
        title: 'Weekly approvals — how it works',
        description: 'Review each employee’s weekly sheet, then approve/reject attendance and job time submissions.',
        content: (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>
                Use <span className="font-medium text-foreground">View sheet</span> to review daily punches and job entries.
              </li>
              <li>
                For <span className="font-medium text-foreground">SUBMITTED</span> items, approve or reject.
              </li>
              <li>Rejecting unlocks the week so the employee can update and resubmit.</li>
            </ul>
          </div>
        ),
      }}
    >
      <WeeklyApprovalsDashboard />
    </DashboardPageShell>
  )
}

