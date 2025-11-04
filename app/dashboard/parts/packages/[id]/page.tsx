import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PackageDetailPage } from '@/components/parts/package-detail-page'

export const dynamic = 'force-dynamic'

export default async function PackageDetailPageRoute({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  const resolvedParams = params instanceof Promise ? await params : params
  const { id } = resolvedParams

  try {
    const packageData = await prisma.package.findUnique({
      where: { id },
      include: {
        parts: {
          include: {
            part: {
              include: {
                relatedPartsA: {
                  include: {
                    partB: {
                      select: {
                        id: true,
                        partNumber: true,
                        manufacturer: true,
                        description: true,
                      },
                    },
                  },
                },
                relatedPartsB: {
                  include: {
                    partA: {
                      select: {
                        id: true,
                        partNumber: true,
                        manufacturer: true,
                        description: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!packageData) {
      return (
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-red-900 mb-2">Package Not Found</h2>
            <p className="text-red-800">The requested package could not be found.</p>
          </div>
        </div>
      )
    }

    // Transform data
    const result = {
      ...packageData,
      parts: packageData.parts.map(pp => {
        const part = pp.part
        const relatedParts = [
          ...part.relatedPartsA.map(rel => rel.partB),
          ...part.relatedPartsB.map(rel => rel.partA),
        ]

        let secondarySources: string[] = []
        try {
          if (part.secondarySources) {
            secondarySources = JSON.parse(part.secondarySources)
          }
        } catch (e) {
          // If not valid JSON, treat as empty array
        }

        return {
          ...part,
          purchasePrice: part.purchasePrice ? Number(part.purchasePrice) : null,
          secondarySources,
          relatedParts,
        }
      }),
      createdAt: packageData.createdAt.toISOString(),
      updatedAt: packageData.updatedAt.toISOString(),
    }

    return <PackageDetailPage packageData={result} />
  } catch (error: any) {
    console.error('Error loading package:', error)
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading Package</h2>
          <p className="text-red-800">{error?.message || 'Unknown error occurred'}</p>
        </div>
      </div>
    )
  }
}

