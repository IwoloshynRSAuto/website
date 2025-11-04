import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { PartsDatabaseView } from '@/components/parts/parts-database-view'

export const dynamic = 'force-dynamic'

function PartsDatabaseViewWrapper() {
  return (
    <Suspense fallback={<div className="p-6">Loading parts database...</div>}>
      <PartsDatabaseViewContent />
    </Suspense>
  )
}

async function PartsDatabaseViewContent() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  try {
    // Fetch initial parts data
    const parts = await prisma.part.findMany({
      take: 500,
      orderBy: { createdAt: 'desc' },
      include: {
        relatedPartsA: {
          include: {
            partB: {
              select: {
                id: true,
                partNumber: true,
                manufacturer: true,
                description: true,
              }
            }
          }
        },
        relatedPartsB: {
          include: {
            partA: {
              select: {
                id: true,
                partNumber: true,
                manufacturer: true,
                description: true,
              }
            }
          }
        }
      }
    })

    const total = await prisma.part.count()

    // Parse secondarySources and merge related parts
    const partsResponse = parts.map(part => {
      let secondarySources: string[] = []
      try {
        if (part.secondarySources) {
          secondarySources = JSON.parse(part.secondarySources)
        }
      } catch (e) {
        // If not valid JSON, treat as empty array
      }

      const relatedParts = [
        ...part.relatedPartsA.map(rel => rel.partB),
        ...part.relatedPartsB.map(rel => rel.partA)
      ]

      return {
        ...part,
        purchasePrice: part.purchasePrice ? Number(part.purchasePrice) : null,
        secondarySources,
        relatedParts,
      }
    })

    return (
      <PartsDatabaseView 
        initialParts={partsResponse || []}
        initialTotal={total || 0}
      />
    )
  } catch (error: any) {
    console.error('Error loading parts database:', error)
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading Parts Database</h2>
          <p className="text-red-800">{error?.message || 'Unknown error occurred'}</p>
        </div>
      </div>
    )
  }
}

export default function PartsDatabasePage() {
  return <PartsDatabaseViewWrapper />
}

