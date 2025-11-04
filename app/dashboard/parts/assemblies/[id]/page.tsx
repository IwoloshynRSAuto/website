import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { BOMEditor } from '@/components/parts/bom-editor'

export const dynamic = 'force-dynamic'

export default async function AssemblyDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  const resolvedParams = params instanceof Promise ? await params : params
  const { id } = resolvedParams

  try {
    const bom = await prisma.bOM.findUnique({
      where: { id },
      include: {
        parts: {
          include: {
            originalPart: {
              select: {
                id: true,
                partNumber: true,
                manufacturer: true,
                description: true,
                category: true,
                subcategory: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!bom) {
      return (
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-red-900 mb-2">BOM Not Found</h2>
            <p className="text-red-800">The requested BOM could not be found.</p>
          </div>
        </div>
      )
    }

    // Serialize dates and calculate totals
    const bomData = {
      ...bom,
      status: bom.status || 'DRAFT',
      notes: bom.notes || null,
      parts: bom.parts.map(part => ({
        ...part,
        purchasePrice: Number(part.purchasePrice),
        markupPercent: Number(part.markupPercent),
        customerPrice: Number(part.customerPrice),
        estimatedDelivery: part.estimatedDelivery?.toISOString() || null,
        createdAt: part.createdAt.toISOString(),
        updatedAt: part.updatedAt.toISOString(),
        category: part.originalPart?.category || null,
        subcategory: part.originalPart?.subcategory || null,
      })),
      createdAt: bom.createdAt.toISOString(),
      updatedAt: bom.updatedAt.toISOString(),
    }

    return <BOMEditor initialBOM={bomData} />
  } catch (error: any) {
    console.error('Error loading BOM:', error)
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading BOM</h2>
          <p className="text-red-800">{error?.message || 'Unknown error occurred'}</p>
        </div>
      </div>
    )
  }
}

