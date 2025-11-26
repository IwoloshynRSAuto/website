'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { ChevronLeft, ChevronRight, Search, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { JobsTableStandard } from './jobs-table-standard'
import { CreateJobButton } from './create-job-button'
import { MultiSOPButton } from '@/components/common/multi-sop-button'
import { SOPS } from '@/lib/sops'

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

interface JobsDatabaseViewProps {
  initialJobs?: Job[]
  initialTotal?: number
  headerButtons?: React.ReactNode
}

export function JobsDatabaseView({ initialJobs = [], initialTotal = 0, headerButtons }: JobsDatabaseViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [total, setTotal] = useState(initialTotal)
  const [isLoading, setIsLoading] = useState(false)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState(searchParams?.get('search') || '')
  const [typeFilter, setTypeFilter] = useState<'all' | 'JOB' | 'QUOTE'>(searchParams?.get('type') as 'all' | 'JOB' | 'QUOTE' || 'all')
  const [statusFilter, setStatusFilter] = useState(searchParams?.get('status') || 'all')
  
  // Sorting
  const [sortBy, setSortBy] = useState(searchParams?.get('sortBy') || 'createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(searchParams?.get('sortOrder') as 'asc' | 'desc' || 'desc')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams?.get('page') || '1', 10))
  const limit = 25
  
  const hasInitializedFromUrl = useRef(false)

  // Update URL with current state
  const updateURL = (search: string, page: number, sort: string, order: 'asc' | 'desc', type: string, status: string) => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (page > 1) params.set('page', page.toString())
    if (sort !== 'createdAt') params.set('sortBy', sort)
    if (order !== 'desc') params.set('sortOrder', order)
    if (type !== 'all') params.set('type', type)
    if (status !== 'all') params.set('status', status)
    
    const newUrl = params.toString() ? `/dashboard/jobs?${params.toString()}` : '/dashboard/jobs'
    router.replace(newUrl, { scroll: false })
  }

  // Fetch jobs with search, pagination, and sorting
  const fetchJobs = async (search: string = searchTerm, page: number = currentPage, sort: string = sortBy, order: 'asc' | 'desc' = sortOrder, type: string = typeFilter, status: string = statusFilter): Promise<void> => {
    setIsLoading(true)
    try {
      // Update URL with current state
      updateURL(search, page, sort, order, type, status)
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy: sort,
        sortOrder: order,
      })
      if (search) {
        params.append('search', search)
      }
      if (type && type !== 'all') {
        params.append('type', type)
      }
      if (status && status !== 'all') {
        params.append('status', status)
      }

      const response = await fetch(`/api/jobs?${params}`)
      if (response.ok) {
        const data = await response.json()
        setJobs(data.jobs || [])
        setTotal(data.pagination?.total || data.total || 0)
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Failed to fetch jobs:', response.status, errorData)
        setJobs([])
        setTotal(0)
      }
    } catch (error) {
      console.error('Error fetching jobs:', error)
      setJobs([])
      setTotal(0)
    } finally {
      setIsLoading(false)
    }
  }

  // Debounced search
  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    searchTimeoutRef.current = setTimeout(() => {
      setCurrentPage(1)
      fetchJobs(searchTerm, 1, sortBy, sortOrder, typeFilter, statusFilter)
    }, 300)
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchTerm])

  // Fetch when filters, sorting, or pagination changes
  useEffect(() => {
    fetchJobs(searchTerm, currentPage, sortBy, sortOrder, typeFilter, statusFilter)
  }, [currentPage, sortBy, sortOrder, typeFilter, statusFilter])

  // Initialize component - check if we have URL params
  useEffect(() => {
    if (hasInitializedFromUrl.current) return
    
    const hasUrlParams = searchParams && (
      searchParams.get('search') ||
      searchParams.get('type') ||
      searchParams.get('status') ||
      searchParams.get('page') !== '1' ||
      searchParams.get('sortBy') !== 'createdAt' ||
      searchParams.get('sortOrder') !== 'desc'
    )

    if (hasUrlParams) {
      // We have URL params, fetch with those
      fetchJobs(
        searchTerm,
        currentPage,
        sortBy,
        sortOrder,
        typeFilter,
        statusFilter
      )
    } else if (initialJobs && initialJobs.length > 0) {
      // No URL params, use initial jobs from server (ONLY on first render)
      setJobs(initialJobs)
      setTotal(initialTotal)
    } else {
      // No initial jobs and no URL params, fetch default list
      fetchJobs('', 1, 'createdAt', 'desc', 'all', 'all')
    }
    
    hasInitializedFromUrl.current = true
  }, [])

  const totalPages = Math.ceil(total / limit)

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
    setCurrentPage(1)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Jobs & Quotes</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage active projects, quotes, timelines, and job progress</p>
        </div>
        {headerButtons || (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <MultiSOPButton 
              sops={[SOPS.CREATE_QUOTE, SOPS.CONVERT_QUOTE]}
              variant="default"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md hover:shadow-lg transition-all duration-200 min-h-[44px] px-6"
            />
            <CreateJobButton />
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Search by job number, title, description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="type-filter">Type</Label>
            <Select
              value={typeFilter}
              onValueChange={(value) => {
                setTypeFilter(value as 'all' | 'JOB' | 'QUOTE')
                setCurrentPage(1)
              }}
            >
              <SelectTrigger id="type-filter">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="JOB">Jobs Only</SelectItem>
                <SelectItem value="QUOTE">Quotes Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="status-filter">Status</Label>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger id="status-filter">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="ON_HOLD">On Hold</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="WON">Won</SelectItem>
                <SelectItem value="LOST">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="sort-by">Sort by:</Label>
            <Select
              value={sortBy}
              onValueChange={(value) => {
                setSortBy(value)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger id="sort-by" className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Date Created</SelectItem>
                <SelectItem value="jobNumber">Job Number</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="updatedAt">Last Updated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="h-9 px-3"
            >
              {sortOrder === 'asc' ? (
                <>
                  <ArrowUp className="h-4 w-4 mr-1" />
                  Ascending
                </>
              ) : (
                <>
                  <ArrowDown className="h-4 w-4 mr-1" />
                  Descending
                </>
              )}
            </Button>
          </div>

          <div className="text-sm text-gray-600 ml-auto">
            Showing {jobs.length} of {total} {typeFilter === 'all' ? 'jobs & quotes' : typeFilter === 'JOB' ? 'jobs' : 'quotes'}
          </div>
        </div>
      </div>

      {/* Jobs Table */}
      <JobsTableStandard
        jobs={jobs}
        headerButtons={headerButtons}
        showCreateButton={false}
        isLoading={isLoading}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t bg-white rounded-b-lg">
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages} ({total} total)
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    disabled={isLoading}
                    className="min-w-[40px]"
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages || isLoading}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}



