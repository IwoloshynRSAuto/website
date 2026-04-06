import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Handle params - could be a Promise in Next.js 15+
    const resolvedParams = params instanceof Promise ? await params : params
    const { id: jobId } = resolvedParams

    // Get the job
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        customer: true,
        quote: true,
      },
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // If job already has a quote, return it
    if (job.quote) {
      return NextResponse.json({
        quote: {
          id: job.quote.id,
          quoteNumber: job.quote.quoteNumber,
          quoteFile: job.quote.quoteFile,
        },
      })
    }

    // Only create quote if job is quote-type
    if (job.type !== 'QUOTE') {
      return NextResponse.json(
        { error: 'Job is not a quote-type job' },
        { status: 400 }
      )
    }

    // Need a customer to create a quote
    if (!job.customerId || !job.customer) {
      return NextResponse.json(
        { error: 'Job must have a customer to create a quote record' },
        { status: 400 }
      )
    }

    // Check if a quote with this job number already exists
    let quote = await prisma.quote.findUnique({
      where: { quoteNumber: job.jobNumber },
    })

    // If not, create it
    if (!quote) {
      quote = await prisma.quote.create({
        data: {
          quoteNumber: job.jobNumber,
          title: job.title,
          description: job.description || null,
          customerId: job.customerId,
          amount: job.estimatedCost ? Number(job.estimatedCost) : 0,
          status: job.status === 'QUOTE' ? 'QUOTE' : 'DRAFT',
        },
      })
    }

    // Link the quote to the job
    if (!job.quoteId) {
      await prisma.job.update({
        where: { id: jobId },
        data: { quoteId: quote.id },
      })
    }

    return NextResponse.json({
      quote: {
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        quoteFile: quote.quoteFile,
      },
    })
  } catch (error: any) {
    console.error('Error getting or creating quote:', error)
    return NextResponse.json(
      { error: 'Failed to get or create quote', details: error.message },
      { status: 500 }
    )
  }
}

