import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Calendar, User, Building, DollarSign, FileText, Clock, Plus } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import { DeleteJobButton } from '@/components/jobs/delete-job-button'
import { JobDetailsClient } from './job-details-client'
import { JobDetailsSync } from './job-details-sync'
import { JobDetailsEditable } from './job-details-editable'
import { ECOHistory } from '@/components/jobs/eco-history'

interface JobDetailsPageProps {
  params: {
    id: string
  }
}

export default async function JobDetailsPage({ params }: JobDetailsPageProps) {
  const job = await prisma.job.findUnique({
    where: { id: params.id },
    include: {
      assignedTo: true,
      createdBy: true,
      customer: true,
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
  const jobWithConvertedTimeEntries = {
    ...job,
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
    <div>
      <JobDetailsEditable job={jobWithConvertedTimeEntries} users={users} customers={customers} />
      <div className="p-6">
        <JobDetailsClient 
          jobId={job.id} 
          jobNumber={job.jobNumber} 
          laborCodes={laborCodes} 
          timeEntries={jobWithConvertedTimeEntries.timeEntries}
          quotedLabor={quotedLabor}
          jobType={job.type}
          relatedQuoteId={job.relatedQuoteId}
        />
        
        {/* ECO History - Show for all jobs */}
        <div className="mt-8">
          <ECOHistory jobId={job.id} jobNumber={job.jobNumber} />
        </div>
      </div>
    </div>
  )
}
