import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { EmployeesAdminClient } from '@/components/admin/employees-admin-client'
import { DashboardPageShell } from '@/components/layout/dashboard-page-shell'

export default async function EmployeesAdminPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin')
  if (session.user.role !== 'ADMIN') redirect('/dashboard')

  return (
    <DashboardPageShell
      title="Employees"
      description="Manage employees (users) in the system."
    >
      <EmployeesAdminClient />
    </DashboardPageShell>
  )
}

