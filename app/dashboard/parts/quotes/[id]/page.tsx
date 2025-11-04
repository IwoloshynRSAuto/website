import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { QuoteDetailPage } from '@/components/parts/quote-detail-page'

export const dynamic = 'force-dynamic'

export default async function QuoteDetailPageRoute({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  const resolvedParams = params instanceof Promise ? await params : params
  const { id } = resolvedParams

  try {
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        linkedBOMs: {
          include: {
            parts: {
              include: {
                originalPart: {
                  select: {
                    id: true,
                    partNumber: true,
                    manufacturer: true,
                    description: true,
                  },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    })

    if (!quote) {
      return (
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-red-900 mb-2">Quote Not Found</h2>
            <p className="text-red-800">The requested quote could not be found.</p>
          </div>
        </div>
      )
    }

    // Get the first linked BOM (if any) - filter out deleted BOMs
    const linkedBOM = quote.linkedBOMs && quote.linkedBOMs.length > 0 ? quote.linkedBOMs[0] : null

    // Verify BOM still exists
    let validBOM = null
    if (linkedBOM) {
      const bomExists = await prisma.bOM.findUnique({
        where: { id: linkedBOM.id },
        select: { id: true }
      })
      if (bomExists) {
        validBOM = linkedBOM
      } else {
        // BOM was deleted, disconnect it from quote
        await prisma.quote.update({
          where: { id: quote.id },
          data: {
            linkedBOMs: {
              disconnect: { id: linkedBOM.id }
            }
          }
        })
      }
    }

    const quoteData = {
      ...quote,
      amount: Number(quote.amount),
      bomId: validBOM?.id || null,
      bom: validBOM ? {
        ...validBOM,
        parts: validBOM.parts.map(part => ({
          ...part,
          purchasePrice: Number(part.purchasePrice),
          markupPercent: Number(part.markupPercent),
          customerPrice: Number(part.customerPrice),
          estimatedDelivery: part.estimatedDelivery?.toISOString() || null,
          quantity: part.quantity,
        })),
      } : null,
      createdAt: quote.createdAt.toISOString(),
      updatedAt: quote.updatedAt.toISOString(),
    }

    return <QuoteDetailPage quote={quoteData} />
  } catch (error: any) {
    console.error('Error loading quote:', error)
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading Quote</h2>
          <p className="text-red-800">{error?.message || 'Unknown error occurred'}</p>
        </div>
      </div>
    )
  }
}

