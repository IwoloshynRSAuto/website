import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PartDetailPage } from '@/components/parts/part-detail-page'

export const dynamic = 'force-dynamic'

export default async function PartDetailPageRoute({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  const resolvedParams = params instanceof Promise ? await params : params
  const { id } = resolvedParams

  try {
    const part = await prisma.part.findUnique({
      where: { id },
      include: {
        packageParts: {
          include: {
            package: {
              select: {
                id: true,
                name: true,
                type: true,
                description: true,
              }
            }
          }
        }
      }
    })

    if (!part) {
      return (
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-red-900 mb-2">Part Not Found</h2>
            <p className="text-red-800">The requested part could not be found.</p>
          </div>
        </div>
      )
    }

    let secondarySources: string[] = []
    try {
      if (part.secondarySources) {
        secondarySources = JSON.parse(part.secondarySources)
      }
    } catch (e) {
      // If not valid JSON, treat as empty array
    }

    // Get unique packages (in case part appears multiple times with different quantities)
    const packagesMap = new Map()
    part.packageParts.forEach(pp => {
      if (!packagesMap.has(pp.package.id)) {
        packagesMap.set(pp.package.id, {
          ...pp.package,
          quantity: pp.quantity || 1,
        })
      }
    })
    const packages = Array.from(packagesMap.values())

    const partData = {
      ...part,
      purchasePrice: part.purchasePrice ? Number(part.purchasePrice) : null,
      secondarySources,
      packages,
    }

    return <PartDetailPage part={partData} />
  } catch (error: any) {
    console.error('Error loading part:', error)
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading Part</h2>
          <p className="text-red-800">{error?.message || 'Unknown error occurred'}</p>
        </div>
      </div>
    )
  }
}

