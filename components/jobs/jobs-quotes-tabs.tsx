'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { JobsTableStandard } from './jobs-table-standard'
import { QuotesKanbanBoard } from '@/components/quotes/quotes-kanban-board'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Wrench, FileText, ChevronLeft, ChevronRight, Search, ArrowUp, ArrowDown } from 'lucide-react'

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

interface JobsQuotesTabsProps {
  headerButtons?: React.ReactNode
  /** Jobs table only (no All / Quotes tabs). Quotes live on /dashboard/quotes. */
  jobsOnly?: boolean
}

export function JobsQuotesTabs({ headerButtons, jobsOnly = false }: JobsQuotesTabsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams?.get('tab')
  const [activeTab, setActiveTab] = useState<'all' | 'jobs' | 'quotes'>(() => {
    if (jobsOnly) return 'jobs'
    if (tabParam === 'quotes' || tabParam === 'all' || tabParam === 'jobs') return tabParam
    return 'jobs'
  })

  const effectiveTab: 'all' | 'jobs' | 'quotes' = jobsOnly ? 'jobs' : activeTab

  // Data state
  const [jobs, setJobs] = useState<Job[]>([])
  const [total, setTotal] = useState(0)
  const [totalJobs, setTotalJobs] = useState(0)
  const [totalQuotes, setTotalQuotes] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  // Filters
  const [searchTerm, setSearchTerm] = useState(searchParams?.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams?.get('status') || 'all')
  
  // Sorting
  const [sortBy, setSortBy] = useState(searchParams?.get('sortBy') || 'createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(searchParams?.get('sortOrder') as 'asc' | 'desc' || 'desc')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams?.get('page') || '1', 10))
  const limit = 25

  const hasInitializedFromUrl = useRef(false)

  // Update URL with current state
  const updateURL = (tab: string, search: string, page: number, sort: string, order: 'asc' | 'desc', status: string) => {
    const params = new URLSearchParams()
    if (!jobsOnly && (tab === 'all' || tab === 'quotes')) params.set('tab', tab)
    if (search) params.set('search', search)
    if (page > 1) params.set('page', page.toString())
    if (sort !== 'createdAt') params.set('sortBy', sort)
    if (order !== 'desc') params.set('sortOrder', order)
    if (status !== 'all') params.set('status', status)
    const newUrl = params.toString() ? `/dashboard/jobs?${params.toString()}` : '/dashboard/jobs'
    router.replace(newUrl, { scroll: false })
  }

  // Fetch jobs with search, pagination, and sorting
  const fetchJobs = async (
    tab: 'all' | 'jobs' | 'quotes' = effectiveTab,
    search: string = searchTerm,
    page: number = currentPage,
    sort: string = sortBy,
    order: 'asc' | 'desc' = sortOrder,
    status: string = statusFilter
  ): Promise<void> => {
    // Quotes tab uses QuotesKanbanBoard + /api/quotes — not the jobs table API.
    if (tab === 'quotes') {
      updateURL(tab, search, page, sort, order, status)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      // Update URL with current state
      updateURL(tab, search, page, sort, order, status)
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy: sort,
        sortOrder: order,
      })
      
      // Set type filter based on active tab
      if (tab === 'jobs') {
        params.append('type', 'JOB')
      } else if (tab === 'quotes') {
        params.append('type', 'QUOTE')
      }
      // 'all' tab doesn't set type filter, so API returns both
      
      if (search) {
        params.append('search', search)
      }
      if (status && status !== 'all') {
        params.append('status', status)
      }

      const response = await fetch(`/api/jobs?${params}`)
      if (response.ok) {
        const data = await response.json()
        setJobs(data.jobs || [])
        const fetchedTotal = data.pagination?.total || data.total || 0
        setTotal(fetchedTotal)
        
        // Update tab-specific totals
        if (tab === 'jobs') {
          setTotalJobs(fetchedTotal)
        } else if (tab === 'quotes') {
          setTotalQuotes(fetchedTotal)
        } else if (tab === 'all') {
          // For 'all' tab, we need to fetch separate counts for jobs and quotes
          // But we'll update total which is the combined count
        }
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
      fetchJobs(effectiveTab, searchTerm, 1, sortBy, sortOrder, statusFilter)
    }, 300)
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchTerm])

  // Fetch when tab, filters, sorting, or pagination changes
  useEffect(() => {
    fetchJobs(effectiveTab, searchTerm, currentPage, sortBy, sortOrder, statusFilter)
  }, [effectiveTab, currentPage, sortBy, sortOrder, statusFilter])

  // Jobs-only page: drop legacy ?tab=quotes / ?tab=all from URL
  useEffect(() => {
    if (!jobsOnly || !searchParams) return
    const t = searchParams.get('tab')
    if (t === 'quotes' || t === 'all') {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('tab')
      const q = params.toString()
      router.replace(q ? `/dashboard/jobs?${q}` : '/dashboard/jobs', { scroll: false })
    }
  }, [jobsOnly, searchParams, router])

  // Fetch totals for tab badges on mount (skip extra quote count when jobs-only)
  useEffect(() => {
    const fetchTotals = async () => {
      try {
        const jobsResponse = await fetch('/api/jobs?type=JOB&limit=1&page=1')
        if (jobsResponse.ok) {
          const jobsData = await jobsResponse.json()
          setTotalJobs(jobsData.pagination?.total || 0)
        }
        if (jobsOnly) return
        const quotesResponse = await fetch('/api/jobs?type=QUOTE&limit=1&page=1')
        if (quotesResponse.ok) {
          const quotesData = await quotesResponse.json()
          setTotalQuotes(quotesData.pagination?.total || 0)
        }
      } catch (error) {
        console.error('Error fetching totals:', error)
      }
    }

    fetchTotals()
  }, [jobsOnly])

  // Initialize component - check if we have URL params
  useEffect(() => {
    if (hasInitializedFromUrl.current) return
    
    const hasUrlParams = searchParams && (
      searchParams.get('search') ||
      searchParams.get('tab') ||
      searchParams.get('status') ||
      searchParams.get('page') !== '1' ||
      searchParams.get('sortBy') !== 'createdAt' ||
      searchParams.get('sortOrder') !== 'desc'
    )

    if (hasUrlParams) {
      fetchJobs(
        jobsOnly ? 'jobs' : activeTab,
        searchTerm,
        currentPage,
        sortBy,
        sortOrder,
        statusFilter
      )
    } else {
      fetchJobs('jobs', '', 1, 'createdAt', 'desc', 'all')
    }
    
    hasInitializedFromUrl.current = true
  }, [])

  const totalPages = Math.ceil(total / limit)

  const handleTabChange = (value: string) => {
    if (jobsOnly) return
    const newTab = value as 'all' | 'jobs' | 'quotes'
    setActiveTab(newTab)
    setCurrentPage(1)
  }

  const searchSortRow = (
    <div className="flex flex-wrap items-end gap-3 mb-3">
      <div className="flex-1 min-w-[200px]">
        <Label htmlFor="search">Search</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="search"
            placeholder="Search by job number, title, customer name, description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="w-[180px]">
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
          onClick={() => {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
            setCurrentPage(1)
          }}
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
        Showing {jobs.length} of {total} jobs
      </div>
    </div>
  )

  const paginationRow =
    totalPages > 1 ? (
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
    ) : null

  if (jobsOnly) {
    return (
      <div className="space-y-2">
        {headerButtons && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-3 mb-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">{headerButtons}</div>
          </div>
        )}
        {searchSortRow}
        <JobsTableStandard jobs={jobs} headerButtons={undefined} isLoading={isLoading} />
        {paginationRow}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        {/* Header Row: Tabs + Action Buttons */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
          <TabsList className="grid grid-cols-3 gap-1.5 bg-muted/50 p-1 h-auto rounded-lg border border-gray-200">
            <TabsTrigger
              value="all"
              className="flex items-center justify-center gap-1.5 text-xs sm:text-sm font-medium border border-transparent shadow-none min-h-9 px-2 sm:px-3 py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:border-gray-300 data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground"
            >
              <Wrench className="h-4 w-4 shrink-0" />
              <span className="truncate">All ({activeTab === 'all' ? total : totalJobs + totalQuotes || '...'})</span>
            </TabsTrigger>
            <TabsTrigger
              value="jobs"
              className="flex items-center justify-center gap-1.5 text-xs sm:text-sm font-medium border border-transparent shadow-none min-h-9 px-2 sm:px-3 py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:border-gray-300 data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground"
            >
              <Wrench className="h-4 w-4 shrink-0" />
              <span className="truncate">Jobs ({activeTab === 'jobs' ? total : totalJobs || '...'})</span>
            </TabsTrigger>
            <TabsTrigger
              value="quotes"
              className="flex items-center justify-center gap-1.5 text-xs sm:text-sm font-medium border border-transparent shadow-none min-h-9 px-2 sm:px-3 py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:border-gray-300 data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground"
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span className="truncate">Quotes ({activeTab === 'quotes' ? total : totalQuotes || '...'})</span>
            </TabsTrigger>
          </TabsList>
          
          {headerButtons && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {headerButtons}
            </div>
          )}
        </div>

        {/* Search, Status, and Sort Controls — hidden on Quotes (workflow has its own path) */}
        {activeTab !== 'quotes' && (
        <div className="flex flex-wrap items-end gap-3 mb-3">
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Search by job number, title, customer name, description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="w-[180px]">
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
              onClick={() => {
                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                setCurrentPage(1)
              }}
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
            Showing {jobs.length} of {total} {activeTab === 'all' ? 'jobs & quotes' : activeTab === 'jobs' ? 'jobs' : 'quotes'}
          </div>
        </div>
        )}

        <TabsContent value="all" className="mt-0">
          <JobsTableStandard
            jobs={jobs}
            headerButtons={headerButtons}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="jobs" className="mt-0">
          <JobsTableStandard
            jobs={jobs}
            headerButtons={headerButtons}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="quotes" className="mt-0">
          <QuotesKanbanBoard initialQuotes={[]} fetchOnMount embedded />
        </TabsContent>
      </Tabs>

      {/* Pagination — not used for Quotes workflow tab */}
      {activeTab !== 'quotes' && totalPages > 1 && (
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
