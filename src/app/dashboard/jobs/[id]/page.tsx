import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { JobDetailsClient } from './job-details-client'
import { JobDetailsEditable } from './job-details-editable'
import { ECOHistory } from '@/components/jobs/eco-history'
import { dashboardUi } from '@/components/layout/dashboard-ui'

interface JobDetailsPageProps {
  params: Promise<{
    id: string
  }> | {
    id: string
  }
}

export default async function JobDetailsPage({ params }: JobDetailsPageProps) {
  // Handle params - could be a Promise in Next.js 15+
  const resolvedParams = params instanceof Promise ? await params : params
  const jobId = resolvedParams.id

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      assignedTo: true,
      createdBy: true,
      customer: true,
      quote: {
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
        },
      },
      quotedLabor: {
        include: {
          laborCode: true
        }
      },
      timeEntries: {
        include: {
          user: true,
          laborCode: true
        }
      },
      milestones: {
        orderBy: {
          scheduledStartDate: 'asc'
        }
      },
      _count: {
        select: {
          timeEntries: true
        }
      }
    }
  })

  if (!job) {
    notFound()
  }

  // Convert Decimal values to numbers in timeEntries
  // Filter quote to only include the fields we need (to avoid serialization issues)
  const jobWithConvertedTimeEntries = {
    ...job,
    quote: job.quote ? {
      id: job.quote.id,
      quoteNumber: job.quote.quoteNumber,
      quoteFile: job.quote.quoteFile,
    } : null,
    timeEntries: job.timeEntries.map(entry => ({
      ...entry,
      laborCode: entry.laborCode ? {
        ...entry.laborCode,
        hourlyRate: Number(entry.laborCode.hourlyRate)
      } : null
    }))
  }

  // Fetch users and customers for the editable component
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true
    }
  })

  const customers = await prisma.customer.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      isActive: true
    }
  })

  // Fetch labor codes for the quoted labor tracking
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

  // Convert Decimal to number
  const laborCodes = laborCodesData.map(lc => ({
    ...lc,
    hourlyRate: Number(lc.hourlyRate)
  }))

  // Convert quoted labor data
  const quotedLabor = job.quotedLabor.map(ql => ({
    laborCodeId: ql.laborCodeId,
    estimatedHours: ql.estimatedHours
  }))

  return (
    <div className={dashboardUi.pageWrap}>
      <JobDetailsEditable job={jobWithConvertedTimeEntries} users={users} customers={customers} />
      <div>
        <JobDetailsClient
          jobId={job.id}
          jobNumber={job.jobNumber}
          laborCodes={laborCodes}
          timeEntries={jobWithConvertedTimeEntries.timeEntries}
          quotedLabor={quotedLabor}
          jobType={job.type}
          relatedQuoteId={job.relatedQuoteId}
          users={users}
          bom={job.quote?.linkedBOMs && job.quote.linkedBOMs.length > 0 ? {
            ...job.quote.linkedBOMs[0],
            parts: job.quote.linkedBOMs[0].parts.map(part => ({
              ...part,
              purchasePrice: Number(part.purchasePrice),
              markupPercent: Number(part.markupPercent),
              customerPrice: Number(part.customerPrice),
              estimatedDelivery: part.estimatedDelivery?.toISOString() || null,
            })),
          } : null}
          milestones={job.milestones.map(m => ({
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
          }))}
        />

        {/* ECO History - Show for all jobs */}
        <div className="mt-8">
          <ECOHistory jobId={job.id} jobNumber={job.jobNumber} />
        </div>
      </div>
    </div>
  )
}
