import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { EmployeeEditClient } from '@/components/admin/employee-edit-client'
import { DashboardPageShell } from '@/components/layout/dashboard-page-shell'

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin')
  if (session.user.role !== 'ADMIN') redirect('/dashboard')

  const resolved = params instanceof Promise ? await params : params

  return (
    <DashboardPageShell className="max-w-3xl" title="Edit Employee" description="Update employee details and access.">
      <EmployeeEditClient mode="edit" userId={resolved.id} />
    </DashboardPageShell>
  )
}

