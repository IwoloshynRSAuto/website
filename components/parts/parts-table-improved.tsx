'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Edit, Trash2, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Search, Plus, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { CreatePartDialog } from './create-part-dialog'

interface Part {
  id: string
  partNumber: string
  manufacturer: string
  description: string | null
  category: string | null
  subcategory: string | null
  primarySource: string | null
  purchasePrice: number | null
  lastKnownPrice?: {
    price: number
    vendor: { id: string; name: string }
    date: string
  } | null
  lastPurchased?: {
    date: string
    vendor: { id: string; name: string }
    price: number
    leadTimeDays: number | null
  } | null
  createdAt?: string
  updatedAt?: string
}

export function PartsTableImproved() {
  const router = useRouter()
  const [parts, setParts] = useState<Part[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedVendor, setSelectedVendor] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [stockFilter, setStockFilter] = useState('all') // 'all', 'in-stock', 'out-of-stock'
  
  // Sorting
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const limit = 50

  // Fetch vendors for filter
  const [vendors, setVendors] = useState<Array<{ id: string; name: string }>>([])
  const [brands, setBrands] = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    // Fetch vendors
    fetch('/api/vendors')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setVendors(data.data || [])
        }
      })
      .catch(console.error)
  }, [])

  const fetchParts = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder,
      })
      
      if (searchTerm) params.append('search', searchTerm)
      if (selectedVendor && selectedVendor !== 'all') params.append('vendorId', selectedVendor)
      if (selectedBrand && selectedBrand !== 'all') params.append('brand', selectedBrand)
      if (selectedCategory && selectedCategory !== 'all') params.append('category', selectedCategory)

      const response = await fetch(`/api/parts?${params}`)
      if (response.ok) {
        const data = await response.json()
        setParts(data.parts || [])
        setTotal(data.pagination?.total || 0)
        
        // Extract unique brands and categories
        const uniqueBrands = [...new Set((data.parts || []).map((p: Part) => p.manufacturer).filter(Boolean))]
        const uniqueCategories = [...new Set((data.parts || []).map((p: Part) => p.category).filter(Boolean))]
        setBrands(uniqueBrands.sort())
        setCategories(uniqueCategories.sort())
      }
    } catch (error) {
      console.error('Error fetching parts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchParts()
  }, [currentPage, sortBy, sortOrder, searchTerm, selectedVendor, selectedBrand, selectedCategory])

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
    setCurrentPage(1)
  }

  const handleViewPart = (part: Part) => {
    router.push(`/dashboard/parts/database/${part.id}`)
  }

  const handleEditPart = (part: Part) => {
    router.push(`/dashboard/parts/database/${part.id}`)
  }

  const handleDeletePart = async (part: Part) => {
    if (!confirm(`Are you sure you want to delete part ${part.partNumber}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/parts/${part.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchParts()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete part')
      }
    } catch (error) {
      console.error('Error deleting part:', error)
      alert('An error occurred while deleting the part')
    }
  }

  const handlePartCreated = () => {
    setIsCreateDialogOpen(false)
    fetchParts()
  }

  const SortButton = ({ field, children }: { field: string; children: React.ReactNode }) => {
    const isActive = sortBy === field
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-auto p-0 font-semibold hover:bg-transparent"
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center space-x-1">
          <span>{children}</span>
          {isActive ? (
            sortOrder === 'asc' ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-50" />
          )}
        </div>
      </Button>
    )
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Part number, name, description..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-8"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="vendor">Vendor</Label>
              <Select value={selectedVendor || 'all'} onValueChange={(value) => {
                setSelectedVendor(value === 'all' ? '' : value)
                setCurrentPage(1)
              }}>
                <SelectTrigger id="vendor">
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
              <Label htmlFor="brand">Brand</Label>
              <Select value={selectedBrand || 'all'} onValueChange={(value) => {
                setSelectedBrand(value === 'all' ? '' : value)
                setCurrentPage(1)
              }}>
                <SelectTrigger id="brand">
                  <SelectValue placeholder="All brands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All brands</SelectItem>
                  {brands.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={selectedCategory || 'all'} onValueChange={(value) => {
                setSelectedCategory(value === 'all' ? '' : value)
                setCurrentPage(1)
              }}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="stock">Stock Status</Label>
              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger id="stock" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="in-stock">In Stock</SelectItem>
                  <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Part
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto max-h-[calc(100vh-400px)] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-white z-10">
              <TableRow>
                <TableHead className="w-[150px]">
                  <SortButton field="partNumber">Part Name</SortButton>
                </TableHead>
                <TableHead className="w-[120px]">
                  <SortButton field="manufacturer">Brand</SortButton>
                </TableHead>
                <TableHead className="w-[150px]">Vendor</TableHead>
                <TableHead className="w-[120px] text-right">
                  <SortButton field="purchasePrice">Price</SortButton>
                </TableHead>
                <TableHead className="w-[150px]">Last Purchased</TableHead>
                <TableHead className="w-[120px]">Lead Time</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : parts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No parts found
                  </TableCell>
                </TableRow>
              ) : (
                parts.map((part) => (
                  <TableRow
                    key={part.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleViewPart(part)}
                  >
                    <TableCell className="font-medium">
                      <div>
                        <div>{part.partNumber}</div>
                        {part.description && (
                          <div className="text-xs text-gray-500 truncate max-w-[200px]">
                            {part.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{part.manufacturer}</TableCell>
                    <TableCell>
                      {part.lastKnownPrice?.vendor.name || part.lastPurchased?.vendor.name || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {part.lastKnownPrice?.price !== undefined
                        ? `$${part.lastKnownPrice.price.toFixed(2)}`
                        : part.purchasePrice !== null
                        ? `$${part.purchasePrice.toFixed(2)}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {part.lastPurchased?.date
                        ? format(new Date(part.lastPurchased.date), 'MMM d, yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {part.lastPurchased?.leadTimeDays !== null && part.lastPurchased?.leadTimeDays !== undefined
                        ? `${part.lastPurchased.leadTimeDays} days`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewPart(part)}
                          className="h-8 w-8 p-0"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditPart(part)}
                          className="h-8 w-8 p-0"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePart(part)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
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
      </Card>

      {/* Create Part Dialog */}
      <CreatePartDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onPartCreated={handlePartCreated}
      />
    </div>
  )
}

