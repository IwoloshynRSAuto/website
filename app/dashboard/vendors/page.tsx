import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { VendorsDashboard } from '@/components/vendors/vendors-dashboard'

export const dynamic = 'force-dynamic'

export default async function VendorsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  // Fetch vendors with basic stats
  // Handle case where vendors table doesn't exist yet
  let vendorsData: any[] = []
  try {
    const vendors = await prisma.vendor.findMany({
      include: {
        _count: {
          select: {
            purchaseOrders: true,
            partPrices: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    vendorsData = vendors.map(vendor => ({
      id: vendor.id,
      name: vendor.name,
      contactName: vendor.contactName,
      email: vendor.email,
      phone: vendor.phone,
      category: vendor.category,
      isActive: vendor.isActive,
      purchaseOrderCount: vendor._count.purchaseOrders,
      partPriceCount: vendor._count.partPrices,
    }))
  } catch (error: any) {
    // If vendors table doesn't exist, return empty array
    console.warn('Vendors table not found, returning empty list:', error?.message)
    vendorsData = []
  }

  return <VendorsDashboard initialVendors={vendorsData} />
}

