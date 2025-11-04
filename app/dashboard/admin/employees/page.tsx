import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { EmployeesTable } from '@/components/admin/employees-table'
import { CreateUserDialog } from '@/components/admin/create-user-dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, UserPlus } from 'lucide-react'
import { HowToButton } from '@/components/common/how-to-button'
import { SOPS } from '@/lib/sops'

export default async function EmployeesPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard')
  }
  const employees = await prisma.user.findMany({
    orderBy: { name: 'asc' },
    where: {
      // Filter out deleted users (emails starting with "deleted_" or names containing "[DELETED]")
      NOT: {
        OR: [
          { email: { startsWith: 'deleted_' } },
          { name: { contains: '[DELETED]' } }
        ]
      }
    }
  })

  // Convert Decimal fields to numbers for client compatibility
  const employeesResponse = employees.map(employee => ({
    ...employee,
    wage: employee.wage ? Number(employee.wage) : null
  }))

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employee Management</h1>
          <p className="text-gray-600">Manage employee information, positions, wages, and user accounts</p>
        </div>
        <div className="flex items-center gap-2">
          <HowToButton {...SOPS.ADD_EMPLOYEE} />
          <CreateUserDialog />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
            <p className="text-xs text-muted-foreground">
              All system users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {employees.filter(u => u.role === 'ADMIN').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Users with admin privileges
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {employees.filter(u => u.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently active accounts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Employees Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Employees</CardTitle>
          <CardDescription>
            View and manage all employee accounts and information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmployeesTable employees={employeesResponse} />
        </CardContent>
      </Card>
    </div>
  )
}



