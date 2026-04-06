import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { JobService } from '@/lib/jobs/service'

async function parseJsonBody(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    const text = await request.text()
    if (!text.trim()) return {}
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return {}
  }
}

// PATCH / POST — convert an approved (or won) quote to a job
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  return convertQuoteToJob(request, context)
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  return convertQuoteToJob(request, context)
}

async function convertQuoteToJob(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      console.error('[convertToJob] Unauthorized request')
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const { id: quoteId } = resolvedParams

    const body = await parseJsonBody(request)
    const assignedToId = body.assignedToId as string | undefined
    const workCode = body.workCode as string | undefined
    const startDate = body.startDate as string | undefined
    const endDate = body.endDate as string | undefined

    console.log('[convertToJob] Converting quote to job:', {
      quoteId,
      userId: session.user.id,
      assignedToId,
    })

    // Get the quote
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        customer: true,
        linkedBOMs: {
          include: {
            parts: true,
          },
        },
        fileRecords: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!quote) {
      console.warn('[convertToJob] Quote not found:', quoteId)
      return NextResponse.json(
        { success: false, error: 'Quote not found' },
        { status: 404 }
      )
    }

    const canConvert = quote.status === 'APPROVED' || quote.status === 'WON'
    if (!canConvert) {
      console.warn('[convertToJob] Quote not in an approved state:', {
        quoteId,
        status: quote.status,
      })
      return NextResponse.json(
        { success: false, error: 'Quote must be approved or won before converting to a job' },
        { status: 400 }
      )
    }

    // Check if job already exists for this quote
    const existingJob = await prisma.job.findUnique({
      where: { quoteId: quoteId },
    })

    if (existingJob) {
      console.warn('[convertToJob] Job already exists for quote:', {
        quoteId,
        jobId: existingJob.id,
      })
      return NextResponse.json(
        { success: false, error: 'Job already exists for this quote' },
        { status: 400 }
      )
    }

    // Generate job number
    const jobNumber = await JobService.generateJobNumber('JOB')

    // Create the job
    const job = await prisma.job.create({
      data: {
        jobNumber,
        title: quote.title,
        description: quote.description || `Job converted from quote ${quote.quoteNumber}`,
        type: 'JOB',
        status: 'PLANNED', // New jobs start as PLANNED
        priority: 'MEDIUM',
        estimatedHours: quote.estimatedHours || null,
        estimatedCost: quote.amount || null,
        customerId: quote.customerId,
        quoteId: quote.id,
        createdFromQuoteId: quote.id, // Link to the quote
        assignedToId: assignedToId || null,
        workCode: workCode || null,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        convertedAt: new Date(),
        createdById: session.user.id,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        quote: {
          select: {
            id: true,
            quoteNumber: true,
            title: true,
            status: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    console.log('[convertToJob] Job created successfully:', {
      quoteId,
      jobId: job.id,
      jobNumber: job.jobNumber,
    })

    // Create audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'CREATE',
          resourceType: 'JOB',
          resourceId: job.id,
          details: {
            source: 'QUOTE_CONVERSION',
            quoteId: quote.id,
            quoteNumber: quote.quoteNumber,
          },
        },
      })
    } catch (auditError) {
      console.warn('[convertToJob] Failed to create audit log:', auditError)
      // Don't fail the request if audit log fails
    }

    return NextResponse.json({
      success: true,
      data: job,
    })
  } catch (error: any) {
    console.error('[convertToJob] Error converting quote to job:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      name: error.name,
    })
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    )
  }
}

