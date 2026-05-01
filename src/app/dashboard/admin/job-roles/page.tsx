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
    <DashboardPageShell title="Categories" description="Manage Categories and their Phase Codes.">
      <JobRolesAdminClient />
    </DashboardPageShell>
  )
}

