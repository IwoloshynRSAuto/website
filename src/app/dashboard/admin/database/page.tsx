import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardPageShell } from '@/components/layout/dashboard-page-shell'
import { DatabaseAdminClient } from '@/components/admin/database-admin-client'

export default async function AdminDatabasePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin')
  if (session.user.role !== 'ADMIN') redirect('/dashboard')

  return (
    <DashboardPageShell
      title="Export / import"
      description="Download or upload portal database snapshots (JSON merge; Excel export only)."
    >
      <DatabaseAdminClient />
    </DashboardPageShell>
  )
}
