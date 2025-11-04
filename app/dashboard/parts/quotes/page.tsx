import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { QuotesListView } from '@/components/parts/quotes-list-view'

export const dynamic = 'force-dynamic'

export default async function QuotesPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  try {
    const quotes = await prisma.quote.findMany({
      where: {
        linkedBOMs: {
          some: {}, // Only quotes that have linked BOMs
        },
      },
      include: {
        linkedBOMs: {
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
        },
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const quotesData = quotes.map(quote => {
      // Get the first linked BOM (or all if you want to show multiple)
      const firstBOM = quote.linkedBOMs[0] || null
      const bomParts = firstBOM?.parts || []
      const totalCost = bomParts.reduce((sum, part) => {
        return sum + (Number(part.purchasePrice) * part.quantity)
      }, 0)
      const totalCustomerPrice = bomParts.reduce((sum, part) => {
        return sum + Number(part.customerPrice)
      }, 0)

      return {
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        title: quote.title,
        customerName: quote.customer?.name || null,
        bomId: firstBOM?.id || null,
        bomName: firstBOM?.name || null,
        status: quote.status,
        totalCost,
        totalCustomerPrice,
        createdAt: quote.createdAt.toISOString(),
        updatedAt: quote.updatedAt.toISOString(),
      }
    })

    return <QuotesListView initialQuotes={quotesData} />
  } catch (error: any) {
    console.error('Error loading quotes:', error)
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading Quotes</h2>
          <p className="text-red-800">{error?.message || 'Unknown error occurred'}</p>
        </div>
      </div>
    )
  }
}

