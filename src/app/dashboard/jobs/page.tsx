import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { JobsDevBoard } from '@/components/jobs/jobs-dev-board'
import { DashboardPageShell } from '@/components/layout/dashboard-page-shell'

export const dynamic = 'force-dynamic'

export default async function JobsPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <DashboardPageShell
      title="Jobs"
      description="Browse jobs by status, search, and open a job for details."
    >
      <JobsDevBoard />
    </DashboardPageShell>
  )
}
