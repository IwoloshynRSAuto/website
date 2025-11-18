import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { CustomersTable } from '@/components/admin/customers-table'
import { CreateCustomerDialog } from '@/components/admin/create-customer-dialog'
import { CreateCustomerButton } from '@/components/admin/create-customer-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Users, TrendingUp } from 'lucide-react'
import { HowToButton } from '@/components/common/how-to-button'
import { SOPS } from '@/lib/sops'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function CustomersPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  const customers = await prisma.customer.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          jobs: true
        }
      }
    }
  })

  const activeCustomers = customers.filter(c => c.isActive).length
  const totalJobs = customers.reduce((sum, c) => sum + c._count.jobs, 0)
  const isAdmin = session.user.role === 'ADMIN'

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm sm:text-base text-gray-600">
            {isAdmin 
              ? "Manage customer information, contacts, and accounts" 
              : "View customer information and project history"
            }
          </p>
          </div>
          <Link href="/dashboard/customers/top">
            <Button variant="outline">
              <TrendingUp className="h-4 w-4 mr-2" />
              Top Customers
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6 lg:mb-8">
        <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600" />
            </div>
            <div className="ml-3 lg:ml-4">
              <p className="text-xs lg:text-sm font-medium text-gray-600">Total Customers</p>
              <p className="text-xl lg:text-2xl font-bold text-gray-900">{customers.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-5 h-5 lg:w-6 lg:h-6 text-green-600" />
            </div>
            <div className="ml-3 lg:ml-4">
              <p className="text-xs lg:text-sm font-medium text-gray-600">Active Customers</p>
              <p className="text-xl lg:text-2xl font-bold text-gray-900">{activeCustomers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Building2 className="w-5 h-5 lg:w-6 lg:h-6 text-purple-600" />
            </div>
            <div className="ml-3 lg:ml-4">
              <p className="text-xs lg:text-sm font-medium text-gray-600">Total Jobs</p>
              <p className="text-xl lg:text-2xl font-bold text-gray-900">{totalJobs}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="mt-8">
        <CustomersTable 
          customers={customers} 
          isAdmin={isAdmin}
          headerButtons={isAdmin ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <HowToButton {...SOPS.ADD_CUSTOMER} variant="outline" className="border-gray-300 hover:bg-gray-50" />
              <CreateCustomerButton />
            </div>
          ) : undefined}
        />
      </div>
    </div>
  )
}
