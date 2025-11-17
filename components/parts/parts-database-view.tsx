'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { DashboardPageContainer, DashboardHeader, DashboardContent } from '@/components/layout/dashboard-page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { CreatePartDialog } from './create-part-dialog'
import { PartsTable } from './parts-table'

const CATEGORIES = [
  'Contactor',
  'Drive',
  'Eaton Breakers',
  'HMI',
  'IO',
  'Motor Circuit Breaker',
  'Panel Build',
  'Panels',
  'PLC',
  'Power Supply',
  'Relays',
  'Terminals',
  'Transformers',
]

interface Part {
  id: string
  partNumber: string
  manufacturer: string
  description: string | null
  category: string | null
  subcategory: string | null
  primarySource: string | null
  secondarySources: string[] | undefined
  purchasePrice: number | null
  createdAt?: string
  updatedAt?: string
  relatedParts?: Array<{
    id: string
    partNumber: string
    manufacturer: string
    description: string | null
  }>
}

interface PartsDatabaseViewProps {
  initialParts?: Part[]
  initialTotal?: number
}

export function PartsDatabaseView({ initialParts = [], initialTotal = 0 }: PartsDatabaseViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  
  // Clear form data from localStorage when navigating away from this page
  // Use both pathname change detection and unmount cleanup for reliability
  const isOnDatabasePage = useRef(pathname === '/dashboard/parts/database')
  
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const currentPath = pathname
    const wasOnDatabasePage = isOnDatabasePage.current
    const isNowOnDatabasePage = currentPath === '/dashboard/parts/database'
    
    // If pathname changed AND we're leaving the database page, clear immediately
    if (wasOnDatabasePage && !isNowOnDatabasePage) {
      try {
        localStorage.removeItem('create-part-dialog-form')
        console.log('[PartsDatabaseView] ✅ Cleared form data - pathname changed away from database page')
        console.log('[PartsDatabaseView] Path changed from /dashboard/parts/database to:', currentPath)
      } catch (e) {
        console.error('[PartsDatabaseView] ❌ Error clearing form data:', e)
      }
    }
    
    // Update the ref
    isOnDatabasePage.current = isNowOnDatabasePage
  }, [pathname])
  
  // Also clear on component unmount - this catches navigation even if pathname hasn't updated yet
  useEffect(() => {
    return () => {
      // Check current URL path to see if we're actually leaving
      if (typeof window !== 'undefined') {
        const currentUrl = window.location.pathname
        const leavingDatabasePage = currentUrl !== '/dashboard/parts/database'
        
        if (leavingDatabasePage) {
          try {
            const hadData = localStorage.getItem('create-part-dialog-form')
            localStorage.removeItem('create-part-dialog-form')
            if (hadData) {
              console.log('[PartsDatabaseView] ✅ Cleared form data on unmount - navigating to:', currentUrl)
            }
          } catch (e) {
            console.error('[PartsDatabaseView] ❌ Error clearing form data on unmount:', e)
          }
        }
      }
    }
  }, [])
  const hasInitializedFromUrl = useRef(false)
  
  // Initialize state from URL params if available, otherwise use defaults
  const getInitialState = () => {
    try {
      if (searchParams) {
        return {
          searchTerm: searchParams.get('search') || '',
          currentPage: parseInt(searchParams.get('page') || '1', 10),
          sortBy: searchParams.get('sortBy') || 'createdAt',
          sortOrder: (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc',
          selectedCategory: searchParams.get('category') || '',
          selectedSubcategory: searchParams.get('subcategory') || '',
        }
      }
    } catch (e) {
      // searchParams might throw during SSR or initial render
    }
    return {
      searchTerm: '',
      currentPage: 1,
      sortBy: 'createdAt',
      sortOrder: 'desc' as 'asc' | 'desc',
      selectedCategory: '',
      selectedSubcategory: '',
    }
  }

  const initialState = getInitialState()
  
  // Start with empty arrays - we'll populate from initialParts or URL params on mount
  // This prevents server re-renders from overwriting client state
  // NEVER initialize from initialParts directly - always check hasInitializedFromUrl first
  const [parts, setParts] = useState<Part[]>(() => {
    // Only use initialParts if we haven't initialized yet (will be set in useEffect)
    return []
  })
  const [total, setTotal] = useState(() => {
    return 0
  })
  const [searchTerm, setSearchTerm] = useState(initialState.searchTerm)
  const [currentPage, setCurrentPage] = useState(initialState.currentPage)
  const [isLoading, setIsLoading] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [sortBy, setSortBy] = useState<string>(initialState.sortBy)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initialState.sortOrder)
  const [selectedCategory, setSelectedCategory] = useState<string>(initialState.selectedCategory)
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(initialState.selectedSubcategory)
  const [selectedVendor, setSelectedVendor] = useState<string>('')
  const [isInitialized, setIsInitialized] = useState(false)
  
  // Fetch primary vendors for filter (vendors used as primarySource in parts)
  const [vendors, setVendors] = useState<Array<{ id: string; name: string }>>([])
  
  useEffect(() => {
    // Fetch primary vendors (vendors that are used as primarySource in parts)
    fetch('/api/parts/primary-vendors')
      .then(res => {
        if (!res.ok) {
          console.error('Primary vendors API returned error:', res.status, res.statusText)
          return res.json().then(err => { throw new Error(err.error || 'Failed to fetch') })
        }
        return res.json()
      })
      .then(data => {
        console.log('Primary vendors response:', data)
        if (data.success) {
          const vendorList = data.data || []
          console.log(`Setting ${vendorList.length} vendors in dropdown`)
          setVendors(vendorList)
        } else {
          console.error('Primary vendors API returned success=false:', data.error)
          setVendors([])
        }
      })
      .catch((error) => {
        console.error('Error fetching primary vendors:', error)
        setVendors([])
      })
  }, [])

  const limit = 500

  // Update URL with current filters/sorting
  const updateURL = (search: string, page: number, sort: string, order: 'asc' | 'desc', category: string, subcategory: string, vendor: string) => {
    if (typeof window === 'undefined') return
    
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (page > 1) params.set('page', page.toString())
    if (sort !== 'createdAt') params.set('sortBy', sort)
    if (order !== 'desc') params.set('sortOrder', order)
    if (category) params.set('category', category)
    if (subcategory) params.set('subcategory', subcategory)
    if (vendor) params.set('vendorId', vendor)

    const newUrl = params.toString() 
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname
    
    // Update URL without causing a page reload
    window.history.replaceState({}, '', newUrl)
  }

  // Fetch parts with search, pagination, and sorting
  const fetchParts = async (search: string = searchTerm, page: number = currentPage, sort: string = sortBy, order: 'asc' | 'desc' = sortOrder, category: string = selectedCategory, subcategory: string = selectedSubcategory, vendor: string = selectedVendor): Promise<void> => {
    setIsLoading(true)
    try {
      // Update URL with current state
      updateURL(search, page, sort, order, category, subcategory, vendor)
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })
      if (search) {
        params.append('search', search)
      }
      if (category) {
        params.append('category', category)
      }
      if (subcategory) {
        params.append('subcategory', subcategory)
      }
      if (vendor) {
        params.append('vendorId', vendor)
      }
      params.append('sortBy', sort)
      params.append('sortOrder', order)

      const response = await fetch(`/api/parts?${params}`)
      if (response.ok) {
        const data = await response.json()
        setParts(data.parts || [])
        setTotal(data.pagination?.total || data.total || 0)
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Failed to fetch parts:', response.status, errorData)
        // Set empty state on error
        setParts([])
        setTotal(0)
      }
    } catch (error) {
      console.error('Error fetching parts:', error)
      // Set empty state on error
      setParts([])
      setTotal(0)
    } finally {
      setIsLoading(false)
    }
  }

  // Ref to prevent multiple simultaneous fetches
  const fetchingRef = useRef(false)

    // Debounced search - only debounce search term, not category/subcategory
  useEffect(() => {
    // Skip if not initialized yet (prevents initial double fetch)
    if (!isInitialized || fetchingRef.current) return
    
    const timer = setTimeout(() => {
      fetchingRef.current = true
      setCurrentPage(1)
      fetchParts(searchTerm, 1, sortBy, sortOrder, selectedCategory, selectedSubcategory, selectedVendor).finally(() => {
        fetchingRef.current = false
      })
    }, 300)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, isInitialized])

  // Immediate filter for category changes
  useEffect(() => {
    // Skip if not initialized yet (prevents initial double fetch)
    if (!isInitialized || fetchingRef.current) return
    
    fetchingRef.current = true
    setCurrentPage(1)
    fetchParts(searchTerm, 1, sortBy, sortOrder, selectedCategory, selectedSubcategory, selectedVendor).finally(() => {
      fetchingRef.current = false
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, isInitialized])

  // Debounced filter for subcategory (text search)
  useEffect(() => {
    // Skip if not initialized yet (prevents initial double fetch)
    if (!isInitialized || fetchingRef.current) return
    
    const timer = setTimeout(() => {
      fetchingRef.current = true
      setCurrentPage(1)
      fetchParts(searchTerm, 1, sortBy, sortOrder, selectedCategory, selectedSubcategory, selectedVendor).finally(() => {
        fetchingRef.current = false
      })
    }, 300)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubcategory, isInitialized])

  // Immediate filter for vendor changes
  useEffect(() => {
    // Skip if not initialized yet (prevents initial double fetch)
    if (!isInitialized || fetchingRef.current) return
    
    fetchingRef.current = true
    setCurrentPage(1)
    fetchParts(searchTerm, 1, sortBy, sortOrder, selectedCategory, selectedSubcategory, selectedVendor).finally(() => {
      fetchingRef.current = false
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVendor, isInitialized])

  // Handle page changes
  useEffect(() => {
    // Skip if not initialized yet
    if (!isInitialized) return
    
    fetchParts(searchTerm, currentPage, sortBy, sortOrder, selectedCategory, selectedSubcategory, selectedVendor)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, isInitialized])

  // Handle sort changes
  useEffect(() => {
    // Skip if not initialized yet
    if (!isInitialized) return
    
    setCurrentPage(1)
    fetchParts(searchTerm, 1, sortBy, sortOrder, selectedCategory, selectedSubcategory, selectedVendor)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, sortOrder, isInitialized])

  const handleViewPart = (part: Part) => {
    router.push(`/dashboard/parts/database/${part.id}`)
  }

  const handleEditPart = (part: Part) => {
    router.push(`/dashboard/parts/database/${part.id}`)
  }

  const handleDeletePart = async (part: Part) => {
    if (!confirm(`Are you sure you want to delete part ${part.partNumber}? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/parts/${part.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Preserve all filters when refreshing after delete
        fetchParts(searchTerm, currentPage, sortBy, sortOrder, selectedCategory, selectedSubcategory, selectedVendor)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete part')
      }
    } catch (error) {
      console.error('Error deleting part:', error)
      alert('An error occurred while deleting the part')
    }
  }

  const handlePartCreated = async () => {
    // Close dialog first
    setIsCreateDialogOpen(false)
    
    // Refresh vendor list to include any new vendors from the new part
    fetch('/api/parts/primary-vendors')
      .then(res => {
        if (!res.ok) {
          console.error('Primary vendors API returned error:', res.status, res.statusText)
          return res.json().then(err => { throw new Error(err.error || 'Failed to fetch') })
        }
        return res.json()
      })
      .then(data => {
        if (data.success) {
          const vendorList = data.data || []
          setVendors(vendorList)
        }
      })
      .catch((error) => {
        console.error('Error refreshing vendors:', error)
      })
    
    // Immediately refresh the parts list with current filters
    // Don't wait - this ensures the new part appears right away
    await fetchParts(searchTerm, 1, sortBy, sortOrder, selectedCategory, selectedSubcategory, selectedVendor)
  }

  const totalPages = Math.ceil(total / limit)

  // Initialize component - check if we have URL params, if so fetch with those, otherwise use initial parts
  useEffect(() => {
    // Only initialize once
    if (hasInitializedFromUrl.current) return
    
    const hasUrlParams = searchParams && (
      searchParams.get('search') ||
      searchParams.get('category') ||
      searchParams.get('subcategory') ||
      searchParams.get('page') !== '1' ||
      searchParams.get('sortBy') !== 'createdAt' ||
      searchParams.get('sortOrder') !== 'desc'
    )

    if (hasUrlParams) {
      // We have URL params, fetch with those instead of using initial parts
      const urlVendor = searchParams?.get('vendorId') || ''
      setSelectedVendor(urlVendor)
      fetchParts(
        initialState.searchTerm,
        initialState.currentPage,
        initialState.sortBy,
        initialState.sortOrder,
        initialState.selectedCategory,
        initialState.selectedSubcategory,
        urlVendor
      )
    } else if (initialParts && initialParts.length > 0) {
      // No URL params, use initial parts from server (ONLY on first render)
      setParts(initialParts)
      setTotal(initialTotal)
    } else {
      // No initial parts and no URL params, fetch default list
      fetchParts('', 1, 'createdAt', 'desc', '', '')
    }
    
    // Mark as initialized - this prevents any future re-initialization
    // CRITICAL: This ensures server re-renders can't reset our state
    hasInitializedFromUrl.current = true
    setIsInitialized(true)
    
    // Empty dependency array ensures this only runs once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  

  return (
    <DashboardPageContainer>
      <DashboardHeader
        title="Parts Database"
        subtitle="Manage parts, manufacturers, pricing, and related components"
      >
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all duration-150 ease-in-out"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Part
        </Button>
      </DashboardHeader>

      <DashboardContent>
        {/* Search and Sort Controls */}
        <div className="mb-6 space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="vendor-filter">Vendor</Label>
              <Select
                value={selectedVendor || 'all'}
                onValueChange={(value) => {
                  setSelectedVendor(value === 'all' ? '' : value)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger id="vendor-filter">
                  <SelectValue placeholder="All vendors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All vendors</SelectItem>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="category-filter">Category</Label>
              <Select
                value={selectedCategory || 'all'}
                onValueChange={(value) => {
                  setSelectedCategory(value === 'all' ? '' : value)
                  setSelectedSubcategory('') // Clear subcategory when category changes
                }}
              >
                <SelectTrigger id="category-filter">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="subcategory-filter">Subcategory</Label>
              <Input
                id="subcategory-filter"
                placeholder="Search subcategory (matches text)"
                value={selectedSubcategory}
                onChange={(e) => setSelectedSubcategory(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by part number, manufacturer, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Sort Controls */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-gray-500" />
              <Label htmlFor="sort-by" className="text-sm font-medium text-gray-700">Sort By:</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger id="sort-by" className="h-9 w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Recently Added</SelectItem>
                  <SelectItem value="partNumber">Part Number</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="manufacturer">Manufacturer</SelectItem>
                  <SelectItem value="primarySource">Primary Vendor</SelectItem>
                  <SelectItem value="purchasePrice">Purchase Price</SelectItem>
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
              Showing {parts.length} of {total} parts
            </div>
          </div>
        </div>

        {/* Parts Table */}
        <PartsTable
          parts={parts}
          isLoading={isLoading}
          onView={handleViewPart}
          onEdit={handleEditPart}
          onDelete={handleDeletePart}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={(field) => {
            if (sortBy === field) {
              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
            } else {
              setSortBy(field)
              setSortOrder('asc')
            }
          }}
        />
      </DashboardContent>

      {/* Create Part Dialog */}
      <CreatePartDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onPartCreated={handlePartCreated}
      />
    </DashboardPageContainer>
  )
}

