import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AddPartToBOM } from '@/components/parts/add-part-to-bom'

export const dynamic = 'force-dynamic'

export default async function AddPartToAssemblyPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  const resolvedParams = params instanceof Promise ? await params : params
  const { id: bomId } = resolvedParams

  // Verify BOM exists
  const bom = await prisma.bOM.findUnique({
    where: { id: bomId },
  })

  if (!bom) {
    redirect('/dashboard/parts/assemblies')
  }

  // Fetch all parts for selection
  const parts = await prisma.part.findMany({
    take: 1000,
    orderBy: { partNumber: 'asc' },
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

  const partsResponse = parts.map(part => {
    const relatedParts = [
      ...part.relatedPartsA.map(rel => rel.partB),
      ...part.relatedPartsB.map(rel => rel.partA)
    ]

    return {
      id: part.id,
      partNumber: part.partNumber,
      manufacturer: part.manufacturer,
      description: part.description,
      primarySource: part.primarySource,
      purchasePrice: part.purchasePrice ? Number(part.purchasePrice) : null,
      relatedParts,
    }
  })

  return <AddPartToBOM bomId={bomId} bomName={bom.name} availableParts={partsResponse} />
}
