import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminEmployeeManagement } from '@/components/employee/admin-employee-management'

export default async function EmployeesManagementPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Employee Management</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Manage employees, roles, and organizational hierarchy</p>
      </div>

      <AdminEmployeeManagement />
    </div>
  )
}
