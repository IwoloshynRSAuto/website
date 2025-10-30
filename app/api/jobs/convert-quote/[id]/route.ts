import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Find the quote with its labor estimates
    const quote = await prisma.job.findUnique({
      where: { id },
      include: {
        customer: true,
        assignedTo: true,
        quotedLabor: true,
      }
    })

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    if (quote.type !== 'QUOTE') {
      return NextResponse.json({ error: 'This record is not a quote' }, { status: 400 })
    }

    // Check if already converted
    const existingConversion = await prisma.job.findFirst({
      where: { relatedQuoteId: quote.jobNumber }
    })

    if (existingConversion) {
      return NextResponse.json(
        { error: 'This quote has already been converted to a job', job: existingConversion },
        { status: 400 }
      )
    }

    // Always find the next available E-number (don't reuse quote number)
    // Find all jobs with E prefix
    const allEJobs = await prisma.job.findMany({
      where: {
        jobNumber: {
          startsWith: 'E'
        }
      },
      select: {
        jobNumber: true
      }
    })

    // Extract numbers and find the highest
    const numbers = allEJobs.map(job => {
      const num = parseInt(job.jobNumber.substring(1))
      return isNaN(num) ? 0 : num
    })

    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 1000
    const nextJobNumber = `E${maxNumber + 1}`

    // Create the new job with the next available E-number
    const newJob = await prisma.job.create({
      data: {
        jobNumber: nextJobNumber,
        title: quote.title,
        description: quote.description,
        type: 'JOB',
        status: 'ACTIVE',
        priority: quote.priority,
        estimatedHours: quote.estimatedHours,
        customerId: quote.customerId,
        estimatedCost: quote.estimatedCost,
        dueTodayPercent: quote.dueTodayPercent,
        workCode: quote.workCode,
        assignedToId: quote.assignedToId,
        createdById: quote.createdById,
        relatedQuoteId: quote.jobNumber,
        convertedAt: new Date(),
        startDate: new Date(), // Set start date to today for new jobs
        // Copy quoted labor estimates from the quote
        quotedLabor: {
          create: quote.quotedLabor.map(labor => ({
            laborCodeId: labor.laborCodeId,
            estimatedHours: labor.estimatedHours
          }))
        }
      },
      include: {
        assignedTo: true,
        createdBy: true,
        customer: true,
        quotedLabor: true,
      }
    })

    return NextResponse.json(newJob, { status: 201 })
  } catch (error: any) {
    console.error('Error converting quote to job:', error)
    return NextResponse.json(
      { error: 'Failed to convert quote to job', details: error.message },
      { status: 500 }
    )
  }
}

