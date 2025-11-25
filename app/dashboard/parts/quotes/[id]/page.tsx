import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { QuoteDetailsEditable } from '@/components/parts/quote-details-editable'
import { JobDetailsClient } from '@/app/dashboard/jobs/[id]/job-details-client'

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
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
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

    // Fetch users and customers
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: 'asc' },
    })

    const customers = await prisma.customer.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
      orderBy: { name: 'asc' },
    })

    // Fetch labor codes
    const laborCodesData = await prisma.laborCode.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        category: true,
        hourlyRate: true
      },
      orderBy: { code: 'asc' }
    })

    const laborCodes = laborCodesData.map(lc => ({
      ...lc,
      hourlyRate: Number(lc.hourlyRate)
    }))

    // Fetch quoted labor
    const quotedLaborData = await prisma.quoteLaborEstimate.findMany({
      where: { quoteId: quote.id },
      select: {
        laborCodeId: true,
        estimatedHours: true
      }
    })

    const quotedLabor = quotedLaborData.map(ql => ({
      laborCodeId: ql.laborCodeId,
      estimatedHours: Number(ql.estimatedHours)
    }))

    // Fetch milestones
    const milestonesData = await prisma.quoteMilestone.findMany({
      where: { quoteId: quote.id },
      orderBy: { scheduledStartDate: 'asc' }
    })

    const milestones = milestonesData.map(m => ({
      id: m.id,
      name: m.name,
      description: m.description,
      milestoneType: m.milestoneType,
      scheduledStartDate: m.scheduledStartDate?.toISOString() || null,
      scheduledEndDate: m.scheduledEndDate?.toISOString() || null,
      actualStartDate: m.actualStartDate?.toISOString() || null,
      actualEndDate: m.actualEndDate?.toISOString() || null,
      status: m.status,
      billingPercentage: m.billingPercentage ? Number(m.billingPercentage) : null,
      isBillingTrigger: m.isBillingTrigger,
    }))

    // Get the first linked BOM (if any)
    const linkedBOM = quote.linkedBOMs && quote.linkedBOMs.length > 0 ? quote.linkedBOMs[0] : null

    let validBOM = null
    if (linkedBOM) {
      const bomExists = await prisma.bOM.findUnique({
        where: { id: linkedBOM.id },
        select: { id: true }
      })
      if (bomExists) {
        validBOM = linkedBOM
      }
    }

    const quoteData = {
      ...quote,
      amount: Number(quote.amount),
      validUntil: quote.validUntil,
      assignedTo: quote.assignedTo,
      createdAt: quote.createdAt,
      updatedAt: quote.updatedAt,
    }

    const bomData = validBOM ? {
      id: validBOM.id,
      name: validBOM.name,
      parts: validBOM.parts.map(part => ({
        ...part,
        purchasePrice: Number(part.purchasePrice),
        markupPercent: Number(part.markupPercent),
        customerPrice: Number(part.customerPrice),
        estimatedDelivery: part.estimatedDelivery?.toISOString() || null,
        quantity: part.quantity,
      })),
    } : null

    return (
      <div className="p-6">
        <QuoteDetailsEditable
          quote={quoteData}
          users={users}
          customers={customers}
        />
        <div className="mt-6">
          <JobDetailsClient
            jobId={quote.id}
            jobNumber={quote.quoteNumber}
            laborCodes={laborCodes}
            timeEntries={[]}
            quotedLabor={quotedLabor}
            jobType="QUOTE"
            relatedQuoteId={null}
            users={users}
            bom={bomData}
            milestones={milestones}
          />
        </div>
      </div>
    )
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

