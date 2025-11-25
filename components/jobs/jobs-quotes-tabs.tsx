'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { JobsTableStandard } from './jobs-table-standard'
import { Wrench, FileText } from 'lucide-react'

interface Job {
  id: string
  jobNumber: string
  title: string
  description: string | null
  type: string
  status: string
  priority: string
  startDate: Date | null
  endDate: Date | null
  estimatedHours: number | null
  actualHours: number | null
  assignedToId: string | null
  createdById: string
  customerId: string | null
  workCode: string | null
  estimatedCost: number | null
  dueTodayPercent: number | null
  inQuickBooks: boolean
  inLDrive: boolean
  fileLink: string | null
  relatedQuoteId: string | null
  createdFromQuoteId: string | null
  convertedAt: Date | null
  createdAt: Date
  updatedAt: Date
  assignedTo: {
    name: string | null
  } | null
  createdBy: {
    name: string | null
  }
  customer: {
    id: string
    name: string
    email: string | null
  } | null
  _count: {
    timeEntries: number
  }
}

interface Quote {
  id: string
  quoteNumber: string
  title: string
  customerName: string | null
  bomId: string | null
  bomName: string | null
  status: string
  totalCost: number
  totalCustomerPrice: number
  createdAt: string
  updatedAt: string
  customer?: {
    id: string
    name: string
    email: string | null
  } | null
  linkedBOMs?: any[]
}

interface JobsQuotesTabsProps {
  jobs: Job[]
  quotes: Quote[]
  headerButtons?: React.ReactNode
}

export function JobsQuotesTabs({ jobs, quotes, headerButtons }: JobsQuotesTabsProps) {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState<'all' | 'jobs' | 'quotes'>(
    (tabParam === 'jobs' || tabParam === 'quotes') ? tabParam : 'all'
  )

  useEffect(() => {
    if (tabParam === 'jobs' || tabParam === 'quotes') {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  // Filter jobs by type
  const jobOnlyItems = jobs.filter(j => j.type === 'JOB')
  const quoteJobItems = jobs.filter(j => j.type === 'QUOTE')

  // Transform quotes to look like jobs for the table
  const quotesAsJobs: Job[] = quotes.map(q => ({
    id: q.id,
    jobNumber: q.quoteNumber,
    title: q.title,
    description: null,
    type: 'QUOTE',
    status: q.status,
    priority: 'MEDIUM',
    startDate: null,
    endDate: null,
    estimatedHours: null,
    actualHours: null,
    assignedToId: null,
    createdById: '',
    customerId: q.customer?.id || null,
    workCode: null,
    estimatedCost: q.totalCustomerPrice || null,
    dueTodayPercent: null,
    inQuickBooks: false,
    inLDrive: false,
    fileLink: null,
    relatedQuoteId: null,
    convertedAt: null,
    createdAt: new Date(q.createdAt),
    updatedAt: new Date(q.updatedAt),
    assignedTo: null,
    createdBy: {
      name: null
    },
    customer: q.customer || null,
    createdFromQuoteId: null,
    _count: {
      timeEntries: 0
    }
  }))

  // Combine all quotes (job-based and BOM-based)
  const allQuotes = [...quoteJobItems, ...quotesAsJobs]
  const allItems = [...jobs, ...quotesAsJobs]

  return (
    <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as 'all' | 'jobs' | 'quotes')} className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-6 gap-2 bg-transparent p-0 h-auto">
        <TabsTrigger
          value="all"
          className="flex items-center gap-2 bg-white border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 active:bg-blue-100 font-bold text-gray-800 hover:text-blue-800 transition-all duration-200 min-h-[44px] rounded-lg shadow-md hover:shadow-lg active:shadow-inner px-4 py-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:border-blue-600"
        >
          <Wrench className="h-5 w-5" />
          All ({allItems.length})
        </TabsTrigger>
        <TabsTrigger
          value="jobs"
          className="flex items-center gap-2 bg-white border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 active:bg-blue-100 font-bold text-gray-800 hover:text-blue-800 transition-all duration-200 min-h-[44px] rounded-lg shadow-md hover:shadow-lg active:shadow-inner px-4 py-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:border-blue-600"
        >
          <Wrench className="h-5 w-5" />
          Jobs ({jobOnlyItems.length})
        </TabsTrigger>
        <TabsTrigger
          value="quotes"
          className="flex items-center gap-2 bg-white border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 active:bg-blue-100 font-bold text-gray-800 hover:text-blue-800 transition-all duration-200 min-h-[44px] rounded-lg shadow-md hover:shadow-lg active:shadow-inner px-4 py-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:border-blue-600"
        >
          <FileText className="h-5 w-5" />
          Quotes ({allQuotes.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="all" className="mt-0">
        <JobsTableStandard
          jobs={allItems}
          headerButtons={headerButtons}
        />
      </TabsContent>

      <TabsContent value="jobs" className="mt-0">
        <JobsTableStandard
          jobs={jobOnlyItems}
          headerButtons={headerButtons}
        />
      </TabsContent>

      <TabsContent value="quotes" className="mt-0">
        {allQuotes.length > 0 ? (
          <JobsTableStandard
            jobs={allQuotes}
            headerButtons={headerButtons}
          />
        ) : (
          <div className="text-center py-12 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No quotes found.</p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}

