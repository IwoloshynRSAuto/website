import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PartsServicesTable } from '@/components/parts-services/parts-services-table'
import { CreatePartsServiceDialog } from '@/components/parts-services/create-parts-service-dialog'
import { CreatePartsServiceButton } from '@/components/parts-services/create-parts-service-button'
import { Package, TrendingUp, CheckCircle, Calendar } from 'lucide-react'

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic'

export default async function PartsServicesPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  // Fetch all parts and services
  const partsServices = await prisma.partsService.findMany({
    orderBy: { createdAt: 'desc' }
  })

  // Calculate stats
  const totalItems = partsServices.length
  const billedItems = partsServices.filter(ps => 
    ps.jobStatus?.toLowerCase().includes('billed') || 
    ps.invoiced
  ).length
  const inQuickBooks = partsServices.filter(ps => ps.inQuickBooks).length
  const thisMonthItems = partsServices.filter(ps => {
    if (!ps.startDate) return false
    const startDate = new Date(ps.startDate)
    const now = new Date()
    return startDate.getMonth() === now.getMonth() && 
           startDate.getFullYear() === now.getFullYear()
  }).length

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Parts & Services</h1>
          <p className="text-sm sm:text-base text-gray-600">Track parts orders, services, and vendor management</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-4 sm:mb-6 lg:mb-8">
        <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600" />
            </div>
            <div className="ml-3 lg:ml-4">
              <p className="text-xs lg:text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-xl lg:text-2xl font-bold text-gray-900">{totalItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 lg:w-6 lg:h-6 text-green-600" />
            </div>
            <div className="ml-3 lg:ml-4">
              <p className="text-xs lg:text-sm font-medium text-gray-600">Billed</p>
              <p className="text-xl lg:text-2xl font-bold text-gray-900">{billedItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6 text-purple-600" />
            </div>
            <div className="ml-3 lg:ml-4">
              <p className="text-xs lg:text-sm font-medium text-gray-600">In QuickBooks</p>
              <p className="text-xl lg:text-2xl font-bold text-gray-900">{inQuickBooks}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Calendar className="w-5 h-5 lg:w-6 lg:h-6 text-yellow-600" />
            </div>
            <div className="ml-3 lg:ml-4">
              <p className="text-xs lg:text-sm font-medium text-gray-600">This Month</p>
              <p className="text-xl lg:text-2xl font-bold text-gray-900">{thisMonthItems}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <PartsServicesTable 
          partsServices={partsServices}
          headerButtons={
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <CreatePartsServiceButton />
            </div>
          }
        />
      </div>
    </div>
  )
}

