import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AddPartToPackage } from '@/components/parts/add-part-to-package'

export const dynamic = 'force-dynamic'

export default async function AddPartToPackagePage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  const resolvedParams = params instanceof Promise ? await params : params
  const { id: packageId } = resolvedParams

  // Verify package exists (using lowercase 'package' model)
  const packageData = await (prisma as any).package.findUnique({
    where: { id: packageId },
    include: {
      parts: {
        select: {
          partId: true,
        },
      },
    },
  })

  if (!packageData) {
    redirect('/dashboard/parts/packages')
  }

  // Fetch all parts for selection (excluding parts already in package)
  const existingPartIds = packageData.parts.map((pp: { partId: string }) => pp.partId)
  const parts = await prisma.part.findMany({
    take: 1000,
    orderBy: { partNumber: 'asc' },
    ...(existingPartIds.length > 0 ? {
      where: {
        id: { notIn: existingPartIds },
      },
    } : {}),
  })

  const partsResponse = parts.map(part => ({
    id: part.id,
    partNumber: part.partNumber,
    manufacturer: part.manufacturer,
    description: part.description,
    primarySource: part.primarySource,
    purchasePrice: part.purchasePrice ? Number(part.purchasePrice) : null,
  }))

  return <AddPartToPackage packageId={packageId} packageName={packageData.name} availableParts={partsResponse} />
}

