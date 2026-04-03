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
      revisions: {
        orderBy: { revisionNumber: 'desc' },
        take: 10,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          laborEstimates: true,
        },
      },
      convertedJob: {
        select: { id: true, jobNumber: true, title: true },
      },
    },
  })

  if (!quote) notFound()

  const serialized = {
    id: quote.id,
    quoteNumber: quote.quoteNumber,
    title: quote.title,
    description: quote.description,
    scope: quote.scope,
    status: quote.status,
    amount: quote.amount,
    validUntil: quote.validUntil?.toISOString() || null,
    createdAt: quote.createdAt.toISOString(),
    updatedAt: quote.updatedAt.toISOString(),
    customer: quote.customer,
    convertedJob: quote.convertedJob,
    revisions: quote.revisions.map((r) => ({
      id: r.id,
      revisionNumber: r.revisionNumber,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
      createdBy: r.createdBy,
      laborEstimates: r.laborEstimates,
    })),
  }

  return <QuoteDetailClient quote={serialized} userId={session.user.id} />
}
