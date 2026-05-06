import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardPageShell } from '@/components/layout/dashboard-page-shell'
import { CustomersAdminClient } from '@/components/admin/customers-admin-client'

export default async function CustomersPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin')

  return (
    <DashboardPageShell
      title="Customers"
      description="View and manage customer records used on quotes and jobs."
    >
      <CustomersAdminClient />
    </DashboardPageShell>
  )
}

