import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PartsServicesTable } from '@/components/parts-services/parts-services-table'
import { CreatePartsServiceDialog } from '@/components/parts-services/create-parts-service-dialog'
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
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parts & Services</h1>
          <p className="text-sm text-gray-600">Track parts orders, services, and vendor management</p>
        </div>
        <div className="flex items-center gap-2">
          <CreatePartsServiceDialog />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Total Items</p>
              <p className="text-xl font-bold text-gray-900">{totalItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Billed</p>
              <p className="text-xl font-bold text-gray-900">{billedItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">In QuickBooks</p>
              <p className="text-xl font-bold text-gray-900">{inQuickBooks}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Calendar className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">This Month</p>
              <p className="text-xl font-bold text-gray-900">{thisMonthItems}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <PartsServicesTable partsServices={partsServices} />
      </div>
    </div>
  )
}

