import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { CustomersAdminClient } from '@/components/admin/customers-admin-client'
import { DashboardPageShell } from '@/components/layout/dashboard-page-shell'

export default async function AdminCustomersPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin')
  if (session.user.role !== 'ADMIN') redirect('/dashboard')

  return (
    <DashboardPageShell
      title="Customers"
      description="View and manage customer records used on quotes and jobs."
    >
      <CustomersAdminClient />
    </DashboardPageShell>
  )
}
