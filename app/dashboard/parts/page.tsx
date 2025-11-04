import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PartsDashboard } from '@/components/parts/parts-dashboard-unified'

export const dynamic = 'force-dynamic'

export default async function PartsDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  try {
    // Fetch counts for dashboard overview
    const [partsCount, packagesCount, bomsCount] = await Promise.all([
      prisma.part.count(),
      prisma.package.count(),
      prisma.bOM.count(),
    ])

    // Fetch recent BOMs
    const recentBOMs = await prisma.bOM.findMany({
      take: 5,
      orderBy: { updatedAt: 'desc' },
      include: {
        parts: {
          select: {
            id: true,
            quantity: true,
            purchasePrice: true,
            customerPrice: true,
          },
        },
      },
    })

    const recentBOMsData = recentBOMs.map(bom => {
      const totalParts = bom.parts.length
      const totalCost = bom.parts.reduce((sum, part) => {
        return sum + (Number(part.purchasePrice) * part.quantity)
      }, 0)
      const totalCustomerPrice = bom.parts.reduce((sum, part) => {
        return sum + Number(part.customerPrice)
      }, 0)

      return {
        id: bom.id,
        name: bom.name,
        status: bom.status || 'DRAFT',
        totalParts,
        totalCost,
        totalCustomerPrice,
        updatedAt: bom.updatedAt.toISOString(),
      }
    })

    return (
      <PartsDashboard
        partsCount={partsCount}
        packagesCount={packagesCount}
        bomsCount={bomsCount}
        recentBOMs={recentBOMsData}
      />
    )
  } catch (error: any) {
    console.error('Error loading parts dashboard:', error)
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-red-800">{error?.message || 'Unknown error occurred'}</p>
        </div>
      </div>
    )
  }
}
