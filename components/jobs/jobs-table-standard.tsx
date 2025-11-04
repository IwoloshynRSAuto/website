'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Folder, Calculator, ArrowUpCircle, FileText, CheckSquare, Square, Filter, ArrowUpDown } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'
import { SubmitECOModal } from './submit-eco-modal'
import { StandardTable } from '@/components/common/standard-table'
import { CreateJobDialog } from './create-job-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

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
  } | null
  _count: {
    timeEntries: number
  }
}

interface JobsTableProps {
  jobs: Job[]
  showCreateButton?: boolean
  headerButtons?: React.ReactNode
}

export function JobsTableStandard({ jobs, showCreateButton = true, headerButtons }: JobsTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [submitECOModalOpen, setSubmitECOModalOpen] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [openingPath, setOpeningPath] = useState<string | null>(null)
  
  // Filter and sort state
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [sortBy, setSortBy] = useState<string>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Clear form data from localStorage when navigating away from jobs page
  const isOnJobsPage = useRef(pathname === '/dashboard/jobs')
  
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const currentPath = pathname
    const wasOnJobsPage = isOnJobsPage.current
    const isNowOnJobsPage = currentPath === '/dashboard/jobs'
    
    // If pathname changed AND we're leaving the jobs page, clear immediately
    if (wasOnJobsPage && !isNowOnJobsPage) {
      try {
        localStorage.removeItem('create-job-dialog-form')
        console.log('[JobsTableStandard] ✅ Cleared form data - navigated away from jobs page')
      } catch (e) {
        console.error('[JobsTableStandard] ❌ Error clearing form data:', e)
      }
    }
    
    isOnJobsPage.current = isNowOnJobsPage
  }, [pathname])
  
  // Also clear on component unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        const currentUrl = window.location.pathname
        const leavingJobsPage = currentUrl !== '/dashboard/jobs'
        
        if (leavingJobsPage) {
          try {
            localStorage.removeItem('create-job-dialog-form')
          } catch (e) {
            console.error('[JobsTableStandard] ❌ Error clearing form data on unmount:', e)
          }
        }
      }
    }
  }, [])

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

  const openInFileExplorer = async (filePath: string | null): Promise<void> => {
    if (!filePath) {
      toast.error('No file path available')
      return
    }
    
    // Prevent double-clicks / multiple simultaneous opens
    if (openingPath === filePath) {
      return // Already opening this path
    }
    
    setOpeningPath(filePath)
    
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
    } finally {
      // Reset after a short delay to allow for the file explorer to open
      setTimeout(() => setOpeningPath(null), 1000)
    }
  }

  const deleteJob = async (job: Job) => {
    if (!confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/jobs/${job.id}`, {
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

  const convertQuoteToJob = async (job: Job) => {
    if (!confirm('Convert this quote to an active job? This will create a new job record while keeping the original quote.')) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/jobs/${job.id}/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        toast.success('Quote converted to job successfully')
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

  const columns = [
    {
      key: 'type',
      label: 'Type',
      width: 'w-8',
      render: (value: string, job: Job) => (
        <Badge className={`text-xs ${job.type === 'QUOTE' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
          {job.type === 'QUOTE' ? 'Q' : 'J'}
        </Badge>
      )
    },
    {
      key: 'jobNumber',
      label: 'Job #',
      sortable: true,
      width: 'w-12',
      className: 'font-medium text-xs'
    },
    {
      key: 'title',
      label: 'Title',
      sortable: true,
      className: 'min-w-[120px]',
      render: (value: string, job: Job) => (
        <div className="truncate text-xs" title={job.title}>{job.title}</div>
      )
    },
    {
      key: 'customer',
      label: 'Customer',
      sortable: true,
      className: 'min-w-[100px]',
      render: (value: any, job: Job) => (
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
      )
    },
    {
      key: 'assignedTo',
      label: 'Contact',
      sortable: true,
      width: 'w-16',
      render: (value: any, job: Job) => (
        <div className="text-xs truncate" title={job.assignedTo?.name || 'Unassigned'}>
          {job.assignedTo ? job.assignedTo.name : 'Unassigned'}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      width: 'w-12',
      render: (value: string, job: Job) => (
        <Badge className={`text-xs ${getStatusColor(job.status)}`}>
          {job.status}
        </Badge>
      )
    },
    {
      key: 'estimatedCost',
      label: 'Amount',
      sortable: true,
      width: 'w-16',
      render: (value: number | null, job: Job) => (
        <div className="text-xs font-medium">
          ${job.estimatedCost ? job.estimatedCost.toLocaleString() : '0'}
        </div>
      )
    },
    {
      key: 'tracking',
      label: 'QB/L',
      width: 'w-12',
      className: 'text-center',
      render: (value: any, job: Job) => (
        <div className="flex items-center justify-center space-x-0.5">
          <span className={`px-0.5 py-0.5 text-xs border rounded ${
            job.inQuickBooks 
              ? 'bg-green-100 border-green-300 text-green-700' 
              : 'bg-gray-100 border-gray-300 text-gray-500'
          }`}>
            QB
          </span>
          <span className={`px-0.5 py-0.5 text-xs border rounded ${
            job.inLDrive 
              ? 'bg-blue-100 border-blue-300 text-blue-700' 
              : 'bg-gray-100 border-gray-300 text-gray-500'
          }`}>
            L
          </span>
        </div>
      )
    },
    {
      key: 'dueTodayPercent',
      label: 'Inv%',
      width: 'w-8',
      render: (value: number | null, job: Job) => (
        <div className="text-xs text-center">
          {job.dueTodayPercent ? `${job.dueTodayPercent}%` : '-'}
        </div>
      )
    },
    {
      key: 'startDate',
      label: 'Start',
      sortable: true,
      width: 'w-12',
      render: (value: Date | null, job: Job) => (
        <div className="text-xs">
          {job.startDate ? format(new Date(job.startDate), 'MM/dd') : '-'}
        </div>
      )
    },
    {
      key: 'timeEntries',
      label: 'Tasks',
      width: 'w-8',
      render: (value: any, job: Job) => (
        <div className="text-xs text-center">
          {job._count.timeEntries || 0}
        </div>
      )
    },
    {
      key: 'fileLink',
      label: 'File',
      width: 'w-8',
      render: (value: string | null, job: Job) => (
        job.fileLink ? (
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0 bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-sm"
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              openInFileExplorer(job.fileLink)
            }}
            disabled={openingPath === job.fileLink}
            title="Open Folder"
          >
            <Folder className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )
      )
    }
  ]

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  // Use headerButtons if provided, otherwise use default Create Job button
  const createButton = headerButtons || (showCreateButton ? (
    <Button
      onClick={() => setIsCreateDialogOpen(true)}
      className="bg-blue-600 hover:bg-blue-700"
    >
      <FileText className="h-4 w-4 mr-2" />
      Create Job
    </Button>
  ) : null)

  // Define available statuses
  const availableStatuses = ['QUOTE', 'ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED']

  // Filter jobs
  const filteredJobs = jobs.filter(job => {
    // When filtering by QUOTE, also include PLANNING status (they're the same)
    let matchesStatus = false
    if (statusFilter === 'ALL') {
      matchesStatus = true
    } else if (statusFilter === 'QUOTE') {
      matchesStatus = job.status === 'QUOTE' || job.status === 'PLANNING'
    } else {
      matchesStatus = job.status === statusFilter
    }
    
    const matchesType = typeFilter === 'ALL' || job.type === typeFilter
    return matchesStatus && matchesType
  })

  // Sort jobs
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    let aValue: any
    let bValue: any

    switch (sortBy) {
      case 'createdAt':
        aValue = new Date(a.createdAt).getTime()
        bValue = new Date(b.createdAt).getTime()
        break
      case 'startDate':
        aValue = a.startDate ? new Date(a.startDate).getTime() : 0
        bValue = b.startDate ? new Date(b.startDate).getTime() : 0
        break
      case 'endDate':
        aValue = a.endDate ? new Date(a.endDate).getTime() : 0
        bValue = b.endDate ? new Date(b.endDate).getTime() : 0
        break
      case 'status':
        aValue = a.status || ''
        bValue = b.status || ''
        break
      case 'jobNumber':
        aValue = a.jobNumber || ''
        bValue = b.jobNumber || ''
        break
      case 'title':
        aValue = a.title || ''
        bValue = b.title || ''
        break
      case 'customer':
        aValue = a.customer?.name || ''
        bValue = b.customer?.name || ''
        break
      default:
        return 0
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
    } else {
      const comparison = String(aValue).localeCompare(String(bValue))
      return sortOrder === 'asc' ? comparison : -comparison
    }
  })

  return (
    <>
      <StandardTable
        title="Jobs"
        data={sortedJobs}
        columns={columns}
        searchFields={['jobNumber', 'title', 'customer.name', 'assignedTo.name']}
        onDelete={deleteJob}
        detailRoute="/dashboard/jobs"
        createButton={createButton}
        emptyMessage="No jobs found"
        className="w-full"
        showEditButton={false}
        filterBar={
          <div className="p-4 bg-white border-b border-gray-200">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <Label htmlFor="status-filter" className="text-sm font-medium text-gray-700">Status:</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status-filter" className="h-9 w-[150px]">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    <SelectItem value="QUOTE">Quote</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="ON_HOLD">On Hold</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <Label htmlFor="type-filter" className="text-sm font-medium text-gray-700">Type:</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger id="type-filter" className="h-9 w-[120px]">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Types</SelectItem>
                    <SelectItem value="JOB">Job</SelectItem>
                    <SelectItem value="QUOTE">Quote</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-gray-500" />
                <Label htmlFor="sort-by" className="text-sm font-medium text-gray-700">Sort By:</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger id="sort-by" className="h-9 w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">Recently Created</SelectItem>
                    <SelectItem value="startDate">Start Date</SelectItem>
                    <SelectItem value="endDate">Due Date</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="jobNumber">Job Number</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="h-9 px-4 bg-white hover:bg-gray-50 border-gray-300 text-gray-700 shadow-sm font-medium"
                >
                  {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
                </Button>
              </div>
            </div>
          </div>
        }
      />

      {submitECOModalOpen && selectedJob && (
        <SubmitECOModal
          job={selectedJob}
          isOpen={submitECOModalOpen}
          onClose={() => {
            setSubmitECOModalOpen(false)
            setSelectedJob(null)
          }}
        />
      )}

      <CreateJobDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
      />
    </>
  )
}
