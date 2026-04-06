import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { EmployeeEditClient } from '@/components/admin/employee-edit-client'
import { DashboardPageShell } from '@/components/layout/dashboard-page-shell'

export default async function NewEmployeePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin')
  if (session.user.role !== 'ADMIN') redirect('/dashboard')

  return (
    <DashboardPageShell className="max-w-3xl" title="Add Employee" description="Create a new employee (user).">
      <EmployeeEditClient mode="create" />
    </DashboardPageShell>
  )
}

