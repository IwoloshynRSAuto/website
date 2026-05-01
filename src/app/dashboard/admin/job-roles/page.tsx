import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardPageShell } from '@/components/layout/dashboard-page-shell'
import { JobRolesAdminClient } from '@/components/admin/job-roles-admin-client'

export default async function JobRolesAdminPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin')
  if (session.user.role !== 'ADMIN') redirect('/dashboard')

  return (
    <DashboardPageShell
      title="Phase codes"
      description="Manage phase code library, hourly rates, overtime multiplier, and which codes each job category and employee may use."
    >
      <JobRolesAdminClient />
    </DashboardPageShell>
  )
}

