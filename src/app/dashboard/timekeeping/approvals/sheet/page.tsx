import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { WeeklyEmployeeSheetView } from '@modules/timekeeping/ui/weekly-employee-sheet-view'
import { isAdmin } from '@/lib/auth/authorization'
import { DashboardPageShell } from '@/components/layout/dashboard-page-shell'

export default async function WeeklyEmployeeSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; weekStart?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/auth/signin')
  }

  if (!isAdmin(session.user)) {
    redirect('/dashboard/timekeeping/attendance')
  }

  const params = await searchParams
  const userId = params.userId?.trim()
  const weekStart = params.weekStart?.trim()

  if (!userId || !weekStart) {
    redirect('/dashboard/timekeeping/approvals')
  }

  return (
    <DashboardPageShell
      title="Submitted sheet"
      description="Review clock and job time for the selected week."
    >
      <WeeklyEmployeeSheetView userId={userId} weekStartIso={weekStart} />
    </DashboardPageShell>
  )
}
