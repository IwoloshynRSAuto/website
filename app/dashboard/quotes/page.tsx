import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { QuoteService } from '@/lib/quotes/service'
import { QuotesKanbanBoard } from '@/components/quotes/quotes-kanban-board'

export const dynamic = 'force-dynamic'

export default async function QuotesPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/signin')
  }

  // Fetch all quotes
  const quotes = await QuoteService.getQuotes({})
  
  // Fetch aging quotes
  const agingQuotes = await QuoteService.getAgingQuotes(30)

  // Format quotes data
  const quotesData = quotes.map((quote) => {
    const firstBOM = quote.linkedBOMs?.[0] || null
    const bomParts = firstBOM?.parts || []
    const totalCost = bomParts.reduce((sum, part) => {
      return sum + Number(part.purchasePrice) * part.quantity
    }, 0)
    const totalCustomerPrice = bomParts.reduce((sum, part) => {
      return sum + Number(part.customerPrice)
    }, 0)

    return {
      id: quote.id,
      quoteNumber: quote.quoteNumber,
      title: quote.title,
      description: quote.description,
      customerName: quote.customer?.name || null,
      customerId: quote.customer?.id || null,
      bomId: firstBOM?.id || null,
      bomName: firstBOM?.name || null,
      status: quote.status as 'DRAFT' | 'APPROVED' | 'CANCELLED',
      amount: quote.amount,
      totalCost,
      totalCustomerPrice,
      validUntil: quote.validUntil?.toISOString() || null,
      lastFollowUp: quote.lastFollowUp?.toISOString() || null,
      createdAt: quote.createdAt.toISOString(),
      updatedAt: quote.updatedAt.toISOString(),
      fileCount: quote._count?.fileRecords || 0,
      job: quote.job ? {
        id: quote.job.id,
        jobNumber: quote.job.jobNumber,
        title: quote.job.title,
      } : null,
    }
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Quotes</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          Manage quotes with an Agile workflow. Move quotes between Draft, Approved, and Cancelled statuses.
        </p>
      </div>

      <QuotesKanbanBoard initialQuotes={quotesData} />
    </div>
  )
}

