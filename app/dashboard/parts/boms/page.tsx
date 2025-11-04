import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { BOMsListView } from '@/components/boms/boms-list-view'

export const dynamic = 'force-dynamic'

interface BOMsPageProps {
  searchParams: Promise<{ status?: string }> | { status?: string }
}

export default async function BOMsPage({ searchParams }: BOMsPageProps) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  try {
    const resolvedSearchParams = searchParams instanceof Promise ? await searchParams : searchParams
    const statusFilter = resolvedSearchParams.status

    const where: any = {}
    if (statusFilter && ['DRAFT', 'ACTIVE', 'ARCHIVED'].includes(statusFilter)) {
      where.status = statusFilter
    }

    const boms = await prisma.bOM.findMany({
      where,
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
      orderBy: { updatedAt: 'desc' },
    })

    const bomsData = boms.map(bom => {
      const totalParts = bom.parts.length
      const totalCost = bom.parts.reduce((sum, part) => {
        return sum + (Number(part.purchasePrice) * part.quantity)
      }, 0)
      const totalCustomerPrice = bom.parts.reduce((sum, part) => {
        return sum + (Number(part.customerPrice))
      }, 0)

      // Parse tags
      let tags: string[] = []
      try {
        if (bom.tags) {
          tags = JSON.parse(bom.tags)
        }
      } catch (e) {
        // If invalid JSON, treat as empty
      }

      return {
        id: bom.id,
        name: bom.name,
        status: bom.status || 'DRAFT',
        tags,
        createdAt: bom.createdAt.toISOString(),
        updatedAt: bom.updatedAt.toISOString(),
        totalParts,
        totalCost,
        totalCustomerPrice,
      }
    })

    return <BOMsListView initialBOMs={bomsData} />
  } catch (error: any) {
    console.error('Error loading BOMs:', error)
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading BOMs</h2>
          <p className="text-red-800">{error?.message || 'Unknown error occurred'}</p>
        </div>
      </div>
    )
  }
}

