import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { QuoteDetailClient } from './quote-detail-client'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }> | { id: string }
}

export default async function QuoteDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/auth/signin')
  }

  const resolvedParams = params instanceof Promise ? await params : params
  const { id } = resolvedParams

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      customer: {
        select: { id: true, name: true, email: true, phone: true },
      },
      job: {
        select: { id: true, jobNumber: true, title: true },
      },
      revisions: {
        orderBy: { revisionNumber: 'desc' },
        take: 10,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
        },
      },
    },
  })

  if (!quote) notFound()

  const serialized = {
    id: quote.id,
    quoteNumber: quote.quoteNumber,
    title: quote.title,
    description: quote.description,
    scope: null as string | null,
    status: quote.status,
    amount: quote.amount,
    validUntil: quote.validUntil?.toISOString() || null,
    paymentTerms: quote.paymentTerms ?? null,
    estimatedHours: quote.estimatedHours != null ? Number(quote.estimatedHours) : null,
    hourlyRate: quote.hourlyRate != null ? Number(quote.hourlyRate) : null,
    createdAt: quote.createdAt.toISOString(),
    updatedAt: quote.updatedAt.toISOString(),
    customer: quote.customer,
    convertedJob: quote.job,
    revisions: quote.revisions.map((r) => {
      const snap = r.data && typeof r.data === 'object' && !Array.isArray(r.data) ? (r.data as Record<string, unknown>) : {}
      const notes = typeof snap.notes === 'string' ? snap.notes : null
      return {
        id: r.id,
        revisionNumber: r.revisionNumber,
        notes,
        createdAt: r.createdAt.toISOString(),
        createdBy: r.createdBy,
        laborEstimates: [] as { id: string; discipline: string; estimatedHours: number }[],
      }
    }),
  }

  return <QuoteDetailClient quote={serialized} />
}
