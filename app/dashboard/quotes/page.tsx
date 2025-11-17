import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { QuoteService } from '@/lib/quotes/service'
import { QuotesDashboard } from '@/components/quotes/quotes-dashboard'

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
      customerName: quote.customer?.name || null,
      customerId: quote.customer?.id || null,
      bomId: firstBOM?.id || null,
      bomName: firstBOM?.name || null,
      status: quote.status,
      amount: quote.amount,
      totalCost,
      totalCustomerPrice,
      validUntil: quote.validUntil?.toISOString() || null,
      lastFollowUp: quote.lastFollowUp?.toISOString() || null,
      createdAt: quote.createdAt.toISOString(),
      updatedAt: quote.updatedAt.toISOString(),
      fileCount: quote._count?.fileRecords || 0,
    }
  })

  // Format aging quotes
  const agingData = agingQuotes.map((quote) => ({
    id: quote.id,
    quoteNumber: quote.quoteNumber,
    title: quote.title,
    customerName: quote.customer?.name || null,
    status: quote.status,
    daysSinceUpdate: quote.daysSinceUpdate,
    isExpired: quote.isExpired,
    agingAlert: quote.agingAlert,
    validUntil: quote.validUntil?.toISOString() || null,
    updatedAt: quote.updatedAt.toISOString(),
  }))

  return <QuotesDashboard initialQuotes={quotesData} initialAgingQuotes={agingData} />
}

