'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Eye, Edit, Trash2, FileDown, Clock, Calendar, DollarSign, ArrowUpDown, ArrowUp, ArrowDown, CheckSquare, Square, Folder, Calculator, ArrowUpCircle, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'
import { SubmitECOModal } from './submit-eco-modal'

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
  // New fields
  customerId: string | null
  workCode: string | null
  estimatedCost: number | null
  dueTodayPercent: number | null
  inQuickBooks: boolean
  inLDrive: boolean
  fileLink: string | null
  relatedQuoteId: string | null
  convertedAt: Date | null
  createdAt: Date
  updatedAt: Date
  assignedTo: {
    name: string | null
  } | null
  quotedLabor?: Array<{
    id: string
    laborCodeId: string
    laborCode: {
      id: string
      code: string
      description: string
      rate: number
    }
    estimatedHours: number
    estimatedCost: number
  }>
  laborCodes?: Array<{
    id: string
    code: string
    description: string
    rate: number
  }>
  timeEntries?: Array<{
    id: string
    laborCodeId: string
    laborCode: {
      id: string
      code: string
      description: string
      rate: number
    }
    regularHours: number
    overtimeHours: number
    totalHours: number
  }>
  createdBy: {
    name: string | null
  }
  customer: {
    id: string
    name: string
    email: string | null
    phone: string | null
    address: string | null
    isActive: boolean
  } | null
  _count: {
    timeEntries: number
  }
}

interface Customer {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  isActive: boolean
}

interface JobsTableProps {
  jobs: Job[]
}

export function JobsTable({ jobs }: JobsTableProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [customerSearchTerm, setCustomerSearchTerm] = useState('')
  const [dateRangeFilter, setDateRangeFilter] = useState('ALL')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [sortBy, setSortBy] = useState<'startDate' | 'updatedAt' | 'status' | 'title' | 'assignedTo' | 'estimatedCost' | 'jobNumber'>('updatedAt')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Function to open File Explorer
  const openInFileExplorer = async (filePath: string | null): Promise<void> => {
    if (!filePath) {
      toast.error('No file path available')
      return
    }
    
    try {
      const response = await fetch('/api/open-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filePath }),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast.success('Opening folder in File Explorer...')
      } else {
        console.error('Failed to open folder:', data.error)
        
        // Fallback: copy path to clipboard
        try {
          await navigator.clipboard.writeText(filePath)
          toast.success(`Path copied to clipboard: ${filePath}`)
        } catch (clipboardError) {
          toast.error(`Failed to open folder. Path: ${filePath}`)
        }
      }
    } catch (error) {
      console.error('Error opening folder:', error)
      toast.error('Failed to open folder')
    }
  }

  // Load customers on component mount
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const response = await fetch('/api/customers?activeOnly=true')
        if (response.ok) {
          const customersData = await response.json()
          setCustomers(customersData)
        }
      } catch (error) {
        console.error('Error loading customers:', error)
      }
    }
    loadCustomers()
  }, [])

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.jobNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (job.assignedTo?.name && job.assignedTo.name.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesStatus = statusFilter === 'ALL' || job.status === statusFilter
    
    const matchesCustomerSearch = !customerSearchTerm || 
      (job.customer?.name && job.customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()))
    
    const matchesDateRange = (() => {
      if (dateRangeFilter === 'ALL') return true
      if (!job.startDate) return dateRangeFilter === 'NO_DATE'
      
      const jobDate = new Date(job.startDate)
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      
      switch (dateRangeFilter) {
        case 'LAST_30_DAYS': return jobDate >= thirtyDaysAgo
        case 'LAST_90_DAYS': return jobDate >= ninetyDaysAgo
        case 'LAST_YEAR': return jobDate >= oneYearAgo
        case 'NO_DATE': return false
        default: return true
      }
    })()

    return matchesSearch && matchesStatus && matchesCustomerSearch && matchesDateRange
  }).sort((a, b) => {
    const dir = sortOrder === 'asc' ? 1 : -1
    switch (sortBy) {
      case 'startDate': {
        const av = a.startDate ? new Date(a.startDate).getTime() : 0
        const bv = b.startDate ? new Date(b.startDate).getTime() : 0
        return dir * (av - bv)
      }
      case 'updatedAt': {
        const av = new Date(a.updatedAt).getTime()
        const bv = new Date(b.updatedAt).getTime()
        return dir * (av - bv)
      }
      case 'status':
        return dir * a.status.localeCompare(b.status)
      case 'title':
        return dir * a.title.localeCompare(b.title)
      case 'assignedTo':
        const aAssigned = a.assignedTo?.name || ''
        const bAssigned = b.assignedTo?.name || ''
        return dir * aAssigned.localeCompare(bAssigned)
      case 'estimatedCost':
        const aCost = a.estimatedCost || 0
        const bCost = b.estimatedCost || 0
        return dir * (aCost - bCost)
      case 'jobNumber':
        return dir * a.jobNumber.localeCompare(b.jobNumber)
      default:
        return 0
    }
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800'
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800'
      case 'QUOTE':
        return 'bg-yellow-100 text-yellow-800'
      case 'Open':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW':
        return 'bg-gray-100 text-gray-800'
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-800'
      case 'HIGH':
        return 'bg-orange-100 text-orange-800'
      case 'URGENT':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }


  const deleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Job deleted successfully')
        router.refresh()
      } else {
        const errorData = await response.json()
        toast.error(`Failed to delete job: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error deleting job:', error)
      toast.error('An error occurred while deleting the job')
    }
  }

  const convertQuoteToJob = async (quoteId: string, event: React.MouseEvent) => {
    event.stopPropagation() // Prevent row click
    
    if (!confirm('Convert this quote to an active job? This will create a new job record while keeping the original quote.')) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/jobs/convert-quote/${quoteId}`, {
        method: 'POST',
      })

      if (response.ok) {
        const newJob = await response.json()
        toast.success(`Quote successfully converted to job ${newJob.jobNumber}`)
        router.refresh()
      } else {
        const errorData = await response.json()
        toast.error(`Failed to convert quote: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error converting quote:', error)
      toast.error('An error occurred while converting the quote')
    } finally {
      setIsLoading(false)
    }
  }

  const exportJobs = () => {
    try {
      // Create CSV content
      const headers = ['Job Number', 'Title', 'Customer', 'Contact', 'Status', 'Amount', 'QB', 'L Drive', 'Invoiced %', 'Start Date', 'Tasks']
      const csvContent = [
        headers.join(','),
        ...filteredJobs.map(job => [
          job.jobNumber,
          `"${job.title}"`,
          job.customer?.name || 'No Customer',
          job.assignedTo?.name || 'Unassigned',
          job.status,
          job.estimatedCost || 0,
          job.inQuickBooks ? 'Yes' : 'No',
          job.inLDrive ? 'Yes' : 'No',
          job.dueTodayPercent || 0,
          job.startDate ? format(new Date(job.startDate), 'MM/dd/yyyy') : 'No Date',
          job._count.timeEntries || 0
        ].join(','))
      ].join('\n')

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `jobs-export-${format(new Date(), 'yyyy-MM-dd')}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success(`Exported ${filteredJobs.length} jobs successfully`)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export jobs')
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Jobs</CardTitle>
          <Button variant="outline" size="sm" onClick={exportJobs}>
            <FileDown className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
        <div className="mt-4">
          {/* Mobile-first responsive filters */}
          <div className="flex flex-col xl:flex-row xl:items-center gap-4 xl:gap-6">
            <div className="flex flex-col lg:flex-row gap-4 flex-1">
              {/* Search jobs */}
              <div className="relative flex-shrink-0">
                <input
                  placeholder="Search jobs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full lg:w-64 px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
              </div>
            
              {/* Sort dropdown */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-shrink-0">
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Sort:</span>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [newSortBy, newSortOrder] = e.target.value.split('-')
                    setSortBy(newSortBy as any)
                    setSortOrder(newSortOrder as 'asc' | 'desc')
                  }}
                  className="w-full sm:w-auto px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[180px]"
                >
                  <option value="updatedAt-desc">Last Updated (Newest)</option>
                  <option value="updatedAt-asc">Last Updated (Oldest)</option>
                  <option value="jobNumber-asc">Job Number (A-Z)</option>
                  <option value="jobNumber-desc">Job Number (Z-A)</option>
                  <option value="startDate-desc">Start Date (Newest)</option>
                  <option value="startDate-asc">Start Date (Oldest)</option>
                  <option value="title-asc">Title (A-Z)</option>
                  <option value="title-desc">Title (Z-A)</option>
                  <option value="status-asc">Status (A-Z)</option>
                  <option value="assignedTo-asc">Assigned To (A-Z)</option>
                </select>
              </div>
            
              {/* Status dropdown */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[140px] flex-shrink-0"
              >
                <option value="ALL">All Status</option>
                <option value="QUOTE">Quote</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              
              {/* Dates dropdown */}
              <select
                value={dateRangeFilter}
                onChange={(e) => setDateRangeFilter(e.target.value)}
                className="w-full sm:w-auto px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[160px] flex-shrink-0"
              >
                <option value="ALL">All Dates</option>
                <option value="LAST_30_DAYS">Last 30 Days</option>
                <option value="LAST_90_DAYS">Last 90 Days</option>
                <option value="LAST_YEAR">Last Year</option>
                <option value="NO_DATE">No Start Date</option>
              </select>
            </div>
            
            <div className="flex flex-col lg:flex-row gap-4">
            
              {/* Search customers */}
              <div className="relative flex-shrink-0">
                <input
                  placeholder="Search customers..."
                  value={customerSearchTerm}
                  onChange={(e) => setCustomerSearchTerm(e.target.value)}
                  className="w-full lg:w-72 px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
              </div>
              
              {/* Clear All button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('ALL')
                  setCustomerSearchTerm('')
                  setDateRangeFilter('ALL')
                  setSortBy('updatedAt')
                  setSortOrder('desc')
                }}
                className="w-full lg:w-auto text-sm px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 whitespace-nowrap flex-shrink-0"
              >
                Clear All
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredJobs.length} of {jobs.length} jobs
        </div>
        <div className="overflow-x-auto">
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="py-1 px-1 text-xs w-8">Type</TableHead>
              <TableHead className="py-1 px-1 text-xs w-12">Job #</TableHead>
              <TableHead className="py-1 px-1 text-xs min-w-[120px]">Title</TableHead>
              <TableHead className="py-1 px-1 text-xs min-w-[100px]">Customer</TableHead>
              <TableHead className="py-1 px-1 text-xs w-16">Contact</TableHead>
              <TableHead className="py-1 px-1 text-xs w-12">Status</TableHead>
              <TableHead className="py-1 px-1 text-xs w-16">Amount</TableHead>
              <TableHead className="py-1 px-1 text-center text-xs w-12">QB/L</TableHead>
              <TableHead className="py-1 px-1 text-xs w-8">Inv%</TableHead>
              <TableHead className="py-1 px-1 text-xs w-12">Start</TableHead>
              <TableHead className="py-1 px-1 text-xs w-8">Tasks</TableHead>
              <TableHead className="py-1 px-1 text-xs w-8">File</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredJobs.map((job, index) => (
              <TableRow 
                key={job.id} 
                className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 cursor-pointer transition-colors duration-150`}
                onClick={() => router.push(`/dashboard/jobs/${job.id}`)}
              >
                <TableCell className="py-1 px-1">
                  <Badge className={`text-xs ${job.type === 'QUOTE' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                    {job.type === 'QUOTE' ? 'Q' : 'J'}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium py-1 px-1 text-xs">{job.jobNumber}</TableCell>
                <TableCell className="py-1 px-1 text-xs">
                  <div className="truncate" title={job.title}>{job.title}</div>
                </TableCell>
                <TableCell className="py-1 px-1">
                  <div className="text-xs">
                    {job.customer ? (
                      <div className="truncate" title={job.customer.name}>
                        <div className="font-medium">{job.customer.name}</div>
                        <div className="text-gray-500 text-xs truncate">{job.customer.email || 'No email'}</div>
                      </div>
                    ) : (
                      <div className="text-gray-500">No Customer</div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-1 px-1">
                  <div className="text-xs truncate" title={job.assignedTo?.name || 'Unassigned'}>
                    {job.assignedTo ? job.assignedTo.name : 'Unassigned'}
                  </div>
                </TableCell>
                <TableCell className="py-1 px-1">
                  <Badge className={`text-xs ${getStatusColor(job.status)}`}>
                    {job.status}
                  </Badge>
                </TableCell>
                <TableCell className="py-1 px-1">
                  <div className="text-xs font-medium">
                    ${job.estimatedCost ? job.estimatedCost.toLocaleString() : '0'}
                  </div>
                </TableCell>
                <TableCell className="py-1 px-1 text-center">
                  <div className="flex items-center justify-center space-x-0.5">
                    <span className={`px-0.5 py-0.5 text-xs border rounded ${
                      job.inQuickBooks 
                        ? 'bg-green-100 border-green-300 text-green-700' 
                        : 'border-gray-300 text-gray-500'
                    }`}>
                      QB
                    </span>
                    <span className={`px-0.5 py-0.5 text-xs border rounded ${
                      job.inLDrive 
                        ? 'bg-green-100 border-green-300 text-green-700' 
                        : 'border-gray-300 text-gray-500'
                    }`}>
                      L
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-1 px-1">
                  <div className="text-xs">
                    {job.dueTodayPercent ? `${job.dueTodayPercent}%` : '0%'}
                  </div>
                </TableCell>
                <TableCell className="py-1 px-1">
                  <div className="text-xs">
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-0.5" />
                      {job.startDate ? format(new Date(job.startDate), 'MM/dd') : 'No Date'}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-1 px-1">
                  <div className="flex items-center text-xs">
                    <Clock className="h-3 w-3 mr-0.5" />
                    {job._count.timeEntries || 0}
                  </div>
                </TableCell>
                <TableCell className="py-1 px-1" onClick={(e) => e.stopPropagation()}>
                  {job.fileLink ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 w-6 p-0 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                      onClick={() => openInFileExplorer(job.fileLink)}
                      title="Open Folder"
                    >
                      <Folder className="h-3 w-3" />
                    </Button>
                  ) : (
                    <span className="text-gray-400 text-xs">-</span>
                  )}
                </TableCell>
                <TableCell className="py-1 px-1" onClick={(e) => e.stopPropagation()}>
                  {job.type === 'QUOTE' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => convertQuoteToJob(job.id, e)}
                      disabled={isLoading}
                      className="text-xs h-6 px-2"
                      title="Convert quote to active job"
                    >
                      <ArrowUpCircle className="h-3 w-3 mr-1" />
                      Upgrade
                    </Button>
                  )}
                  {job.type === 'JOB' && job.relatedQuoteId && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-gray-500 truncate" title={`Converted from ${job.relatedQuoteId}`}>
                        From {job.relatedQuoteId}
                      </span>
                      <SubmitECOModal
                        jobId={job.id}
                        jobNumber={job.jobNumber}
                        timeEntries={job.timeEntries || []}
                        laborCodes={job.laborCodes || []}
                        quotedLabor={job.quotedLabor || []}
                        onECOSubmitted={() => {
                          // Refresh the page or update the data
                          window.location.reload()
                        }}
                      />
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </CardContent>
    </Card>
  )
}
