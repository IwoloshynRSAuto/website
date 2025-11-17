import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PartSaleDetail } from '@/components/part-sales/part-sale-detail'

export const dynamic = 'force-dynamic'

export default async function PartSaleDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  const resolvedParams = params instanceof Promise ? await params : params
  const { id } = resolvedParams

  let partSale
  try {
    partSale = await prisma.quote.findUnique({
      where: { id, quoteType: 'PART_SALE' },
      include: {
        customer: true,
        linkedBOMs: {
          include: {
            parts: {
              include: {
                originalPart: true,
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        fileRecords: {
          orderBy: { createdAt: 'desc' },
        },
        revisions: {
          orderBy: { revisionNumber: 'desc' },
          take: 10,
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        job: {
          select: {
            id: true,
            jobNumber: true,
            title: true,
          },
        },
      },
    })
  } catch (error: any) {
    // If fileRecords or revisions tables don't exist, fetch without them
    console.warn('Error fetching with fileRecords/revisions, falling back to basic query:', error?.message)
    try {
      partSale = await prisma.quote.findUnique({
        where: { id, quoteType: 'PART_SALE' },
        include: {
          customer: true,
          linkedBOMs: {
            include: {
              parts: {
                include: {
                  originalPart: true,
                },
                orderBy: { createdAt: 'asc' },
              },
            },
          },
          job: {
            select: {
              id: true,
              jobNumber: true,
              title: true,
            },
          },
        },
      })
    } catch (fallbackError: any) {
      console.error('Fallback query also failed:', fallbackError)
      redirect('/dashboard/part-sales')
    }
  }

  if (!partSale) {
    redirect('/dashboard/part-sales')
  }

  // Calculate margin and markup
  const bomParts = partSale.linkedBOMs?.[0]?.parts || []
  const totalCost = bomParts.reduce((sum, part) => {
    return sum + Number(part.purchasePrice) * part.quantity
  }, 0)
  const totalCustomerPrice = bomParts.reduce((sum, part) => {
    return sum + Number(part.customerPrice)
  }, 0)
  const margin = totalCustomerPrice > 0 && totalCost > 0 
    ? ((totalCustomerPrice - totalCost) / totalCustomerPrice) * 100 
    : 0
  const markup = totalCost > 0 
    ? ((totalCustomerPrice - totalCost) / totalCost) * 100 
    : 0

  return (
    <PartSaleDetail
      partSale={{
        ...partSale,
        totalCost,
        totalCustomerPrice,
        margin,
        markup,
      }}
    />
  )
}

