'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { toast } from 'react-hot-toast'
import { Search, Plus, X, Package, Box, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/card'

const FORM_STORAGE_KEY = 'create-bom-dialog-form'

interface Part {
  id: string
  partNumber: string
  manufacturer: string
  description: string | null
  category: string | null
  subcategory: string | null
  purchasePrice: number | null
}

interface CreateBOMDialogProps {
  isOpen: boolean
  onClose: () => void
  onBOMCreated: () => void
}

interface Quote {
  id: string
  quoteNumber: string
  title: string
}

interface Package {
  id: string
  name: string
  type: string
  description: string | null
  parts: Array<{
    partId: string
    partNumber: string
    manufacturer: string
    description: string | null
    source: string | null
    purchasePrice: number
    quantity: number
  }>
}

export function CreateBOMDialog({ isOpen, onClose, onBOMCreated }: CreateBOMDialogProps) {
  // Load initial form data from localStorage
  const loadFormData = () => {
    if (typeof window === 'undefined') {
      return {
        bomName: '',
        partQuantities: {} as Record<string, number>,
        packageQuantities: {} as Record<string, number>,
        searchTerm: '',
        selectedQuoteId: '',
        viewMode: 'parts' as 'parts' | 'packages',
        partsPage: 1,
        packagesPage: 1,
        selectedCategory: '',
      }
    }
    
    try {
      const stored = localStorage.getItem(FORM_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return {
          bomName: parsed.bomName || '',
          partQuantities: parsed.partQuantities || {},
          packageQuantities: parsed.packageQuantities || {},
          searchTerm: parsed.searchTerm || '',
          selectedQuoteId: parsed.selectedQuoteId || '',
          viewMode: parsed.viewMode || 'parts',
          partsPage: parsed.partsPage || 1,
          packagesPage: parsed.packagesPage || 1,
          selectedCategory: parsed.selectedCategory || '',
        }
      }
    } catch (e) {
      console.error('[CreateBOMDialog] Error loading form data:', e)
    }
    
    return {
      bomName: '',
      partQuantities: {} as Record<string, number>,
      packageQuantities: {} as Record<string, number>,
      searchTerm: '',
      selectedQuoteId: '',
      viewMode: 'parts' as 'parts' | 'packages',
      partsPage: 1,
      packagesPage: 1,
      selectedCategory: '',
    }
  }
  
  const initialData = loadFormData()
  const [bomName, setBOMName] = useState(initialData.bomName)
  const [parts, setParts] = useState<Part[]>([])
  const [partQuantities, setPartQuantities] = useState<Record<string, number>>(initialData.partQuantities)
  const [searchTerm, setSearchTerm] = useState(initialData.searchTerm)
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>(initialData.selectedQuoteId)
  const [packages, setPackages] = useState<Package[]>([])
  const [packageQuantities, setPackageQuantities] = useState<Record<string, number>>(initialData.packageQuantities)
  const [viewMode, setViewMode] = useState<'parts' | 'packages'>(initialData.viewMode)
  const [partsPage, setPartsPage] = useState(initialData.partsPage)
  const [packagesPage, setPackagesPage] = useState(initialData.packagesPage)
  const [partsTotal, setPartsTotal] = useState(0)
  const [packagesTotal, setPackagesTotal] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState<string>(initialData.selectedCategory)
  const itemsPerPage = 50
  const isInitialMount = useRef(true)
  const skipNextSave = useRef(false)

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
    'Transformers'
  ]

  // Load form data from localStorage when dialog opens
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(FORM_STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          setBOMName(parsed.bomName || '')
          setPartQuantities(parsed.partQuantities || {})
          setPackageQuantities(parsed.packageQuantities || {})
          setSearchTerm(parsed.searchTerm || '')
          setSelectedQuoteId(parsed.selectedQuoteId || '')
          setViewMode(parsed.viewMode || 'parts')
          setPartsPage(parsed.partsPage || 1)
          setPackagesPage(parsed.packagesPage || 1)
          setSelectedCategory(parsed.selectedCategory || '')
          skipNextSave.current = true
          console.log('[CreateBOMDialog] ✅ Restored form data from localStorage')
        }
        fetchParts(1, searchTerm || '', selectedCategory || '')
        fetchQuotes()
        fetchPackages()
      } catch (e) {
        console.error('[CreateBOMDialog] ❌ Error loading form data:', e)
      }
    }
  }, [isOpen])

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }
    
    if (isOpen && typeof window !== 'undefined') {
      try {
        const formData = {
          bomName,
          partQuantities,
          packageQuantities,
          searchTerm,
          selectedQuoteId,
          viewMode,
          partsPage,
          packagesPage,
          selectedCategory,
        }
        localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(formData))
        console.log('[CreateBOMDialog] 💾 Auto-saved form data to localStorage')
      } catch (e) {
        console.error('[CreateBOMDialog] Error saving form data:', e)
      }
    }
  }, [bomName, partQuantities, packageQuantities, searchTerm, selectedQuoteId, viewMode, partsPage, packagesPage, selectedCategory, isOpen])

  // Fetch parts when switching to parts tab
  useEffect(() => {
    if (isOpen && viewMode === 'parts' && parts.length === 0) {
      fetchParts(1, searchTerm, selectedCategory)
    }
  }, [viewMode, isOpen])

  // Debounced search for parts (only when on parts tab)
  useEffect(() => {
    if (!isOpen || viewMode !== 'parts') return
    
    const timer = setTimeout(() => {
      setPartsPage(1)
      fetchParts(1, searchTerm, selectedCategory)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm, viewMode, selectedCategory])

  // Handle parts page changes
  useEffect(() => {
    if (!isOpen || viewMode !== 'parts') return
    fetchParts(partsPage, searchTerm, selectedCategory)
  }, [partsPage, viewMode, selectedCategory])

  const fetchParts = async (page: number = partsPage, search: string = searchTerm, category: string = selectedCategory) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
      })
      if (search) {
        params.append('search', search)
      }
      if (category) {
        params.append('category', category)
      }
      const response = await fetch(`/api/parts?${params}`)
      if (response.ok) {
        const data = await response.json()
        setParts(data.parts || [])
        setPartsTotal(data.pagination?.total || data.total || 0)
      }
    } catch (error) {
      console.error('Error fetching parts:', error)
      toast.error('Failed to load parts')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchQuotes = async () => {
    try {
      // Use /api/quotes/all to get all quotes, not just those with linked BOMs
      const response = await fetch('/api/quotes/all')
      if (response.ok) {
        const data = await response.json()
        setQuotes(data.quotes || [])
      } else {
        // Fallback to regular quotes endpoint
        const fallbackResponse = await fetch('/api/quotes')
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json()
          setQuotes(fallbackData.quotes || [])
        }
      }
    } catch (error) {
      console.error('Error fetching quotes:', error)
      // Don't show error toast for quotes, it's optional
    }
  }

  const fetchPackages = async () => {
    try {
      const response = await fetch('/api/packages')
      if (response.ok) {
        const data = await response.json()
        // Transform packages to match our interface
        const transformedPackages = (data.packages || []).map((pkg: any) => {
          const partsArray = pkg.parts || []
          return {
            id: pkg.id,
            name: pkg.name,
            type: pkg.type || 'Package',
            description: pkg.description,
            parts: partsArray.map((part: any) => ({
              partId: part.id,
              partNumber: part.partNumber,
              manufacturer: part.manufacturer,
              description: part.description,
              source: part.primarySource || null,
              purchasePrice: part.purchasePrice ? Number(part.purchasePrice) : 0,
              quantity: part.quantity || 1,
            }))
          }
        })
        setPackages(transformedPackages)
      }
    } catch (error) {
      console.error('Error fetching packages:', error)
      // Don't show error toast for packages, it's optional
    }
  }

  const handleQuantityChange = (partId: string, quantity: number) => {
    if (quantity <= 0) {
      const newQuantities = { ...partQuantities }
      delete newQuantities[partId]
      setPartQuantities(newQuantities)
    } else {
      setPartQuantities({
        ...partQuantities,
        [partId]: quantity
      })
    }
  }

  const handlePackageQuantityChange = (packageId: string, quantity: number) => {
    if (quantity <= 0) {
      const newQuantities = { ...packageQuantities }
      delete newQuantities[packageId]
      setPackageQuantities(newQuantities)
    } else {
      setPackageQuantities({
        ...packageQuantities,
        [packageId]: quantity
      })
    }
  }

  const handleCreate = async () => {
    if (!bomName.trim()) {
      toast.error('Please enter a BOM name')
      return
    }

    setIsCreating(true)
    try {
      // Clear localStorage after successful creation
      // Will be cleared in the finally block after success
      const partIds = Object.keys(partQuantities).filter(id => partQuantities[id] > 0)
      const packageIds = Object.keys(packageQuantities).filter(id => packageQuantities[id] > 0)
      
      // Create the BOM first
      const bomResponse = await fetch('/api/boms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: bomName,
          partIds,
          partQuantities,
          linkedQuoteId: selectedQuoteId || null,
        }),
      })

      if (!bomResponse.ok) {
        const error = await bomResponse.json()
        throw new Error(error.error || 'Failed to create BOM')
      }

      const bomData = await bomResponse.json()
      const bomId = bomData.id

      // Add packages/assemblies by expanding them into parts
      if (packageIds.length > 0) {
        for (const packageId of packageIds) {
          const pkg = packages.find(p => p.id === packageId)!
          const packageQty = packageQuantities[packageId]
          
          // Expand package into individual parts
          for (const pkgPart of pkg.parts) {
            const response = await fetch(`/api/boms/${bomId}/parts`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                partId: pkgPart.partId,
                partNumber: pkgPart.partNumber,
                manufacturer: pkgPart.manufacturer,
                description: pkgPart.description,
                source: pkgPart.source,
                purchasePrice: pkgPart.purchasePrice,
                quantity: pkgPart.quantity * packageQty, // Multiply package quantity by part quantity
                markupPercent: 20,
              }),
            })

            if (!response.ok) {
              const error = await response.json()
              throw new Error(error.error || 'Failed to add package parts')
            }
          }
        }
      }

      // If a quote was selected, also link the quote to the BOM
      if (selectedQuoteId) {
        try {
          await fetch(`/api/quotes/${selectedQuoteId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bomId }),
          })
        } catch (quoteError) {
          // If quote linking fails, still consider BOM creation successful
          console.warn('Failed to link quote to BOM:', quoteError)
        }
      }

      const totalItems = partIds.length + packageIds.length
      const itemType = packageIds.length > 0 ? 'item(s)' : 'part(s)'
      toast.success(`BOM created successfully with ${totalItems} ${itemType}` + (selectedQuoteId ? ' and linked to quote' : ''))
      
      // Clear localStorage after successful creation
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(FORM_STORAGE_KEY)
          console.log('[CreateBOMDialog] ✅ Cleared form data after successful BOM creation')
        } catch (e) {
          console.error('[CreateBOMDialog] Error clearing form data:', e)
        }
      }
      
      // Reset form state
      setBOMName('')
      setPartQuantities({})
      setPackageQuantities({})
      setSearchTerm('')
      setSelectedQuoteId('')
      setViewMode('parts')
      setPartsPage(1)
      setPackagesPage(1)
      setSelectedCategory('')
      
      onBOMCreated()
    } catch (error) {
      console.error('Error creating BOM:', error)
      toast.error('An error occurred while creating the BOM')
    } finally {
      setIsCreating(false)
    }
  }

  // Parts are already filtered by the API, so use them directly
  const filteredParts = parts

  // Transform quotes for SearchableSelect
  const quoteOptions = quotes.map(quote => ({
    value: quote.id,
    label: `${quote.quoteNumber} - ${quote.title}`,
    searchText: `${quote.quoteNumber} ${quote.title}`
  }))

  // Filter packages locally (packages are fetched all at once)
  const filteredPackages = packages.filter(pkg => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      pkg.name.toLowerCase().includes(search) ||
      (pkg.description?.toLowerCase().includes(search) ?? false) ||
      pkg.type.toLowerCase().includes(search)
    )
  })

  // Paginate filtered packages
  const packagesStartIndex = (packagesPage - 1) * itemsPerPage
  const packagesEndIndex = packagesPage * itemsPerPage
  const paginatedPackages = filteredPackages.slice(packagesStartIndex, packagesEndIndex)
  const packagesTotalPages = Math.ceil(filteredPackages.length / itemsPerPage)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && !isCreating) {
        onClose()
      }
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle>Create New Bill of Materials</DialogTitle>
          <DialogDescription>
            Select parts from the database to include in your BOM
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-y-auto min-h-0 pr-2">
          <div>
            <Label htmlFor="bom-name">BOM Name <span className="text-red-500">*</span></Label>
            <Input
              id="bom-name"
              value={bomName}
              onChange={(e) => setBOMName(e.target.value)}
              placeholder="e.g., Project Alpha - Main Assembly"
              className="mt-1"
              required
            />
            {!bomName.trim() && (
              <p className="text-xs text-red-500 mt-1">BOM name is required to create</p>
            )}
          </div>

          <div>
            <SearchableSelect
              label="Tag to Quote (Optional)"
              options={quoteOptions}
              value={selectedQuoteId}
              onValueChange={(value) => setSelectedQuoteId(value || '')}
              placeholder="Select a quote to tag this BOM..."
              emptyMessage="No quotes found"
            />
            {selectedQuoteId && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedQuoteId('')}
                className="mt-2 text-xs h-6 px-2"
              >
                Clear selection
              </Button>
            )}
          </div>

          <div>
            <Label>Select Parts, Packages, or Assemblies</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search parts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div>
                <Select
                  value={selectedCategory || undefined}
                  onValueChange={(value) => {
                    setSelectedCategory(value)
                    setPartsPage(1)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCategory && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedCategory('')
                      setPartsPage(1)
                    }}
                    className="mt-2 text-xs h-6 px-2"
                  >
                    Clear filter
                  </Button>
                )}
              </div>
            </div>

            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'parts' | 'packages')} className="w-full">
              <TabsList className="w-full justify-start rounded-none border-b">
                <TabsTrigger value="parts" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Parts ({partsTotal})
                </TabsTrigger>
                <TabsTrigger value="packages" className="flex items-center gap-2">
                  <Box className="h-4 w-4" />
                  Packages/Assemblies ({filteredPackages.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="parts" className="m-0">
                <div className="border rounded-lg max-h-96 overflow-y-auto">
                  {isLoading ? (
                    <div className="p-8 text-center text-gray-500">Loading parts...</div>
                  ) : filteredParts.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No parts found</div>
                  ) : (
                    <>
                      <div className="divide-y">
                        {filteredParts.map((part) => (
                          <div
                            key={part.id}
                            className="p-3 hover:bg-gray-50 flex items-center gap-3"
                          >
                            <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{part.partNumber}</div>
                            <div className="text-xs text-gray-500 truncate">
                              {part.manufacturer} • {part.description || 'No description'}
                            </div>
                            {part.category && (
                              <div className="text-xs text-purple-600 mt-1">
                                {part.category}
                                {part.subcategory && ` • ${part.subcategory}`}
                              </div>
                            )}
                              {part.purchasePrice !== null && (
                                <div className="text-xs text-gray-600 mt-1">
                                  ${part.purchasePrice.toFixed(2)}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`qty-${part.id}`} className="text-xs text-gray-600 whitespace-nowrap">
                                Qty:
                              </Label>
                              <Input
                                id={`qty-${part.id}`}
                                type="number"
                                min="0"
                                value={partQuantities[part.id] || ''}
                                onChange={(e) => {
                                  const qty = parseInt(e.target.value) || 0
                                  handleQuantityChange(part.id, qty)
                                }}
                                className="w-20 h-8 text-center"
                                placeholder="0"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      {Math.ceil(partsTotal / itemsPerPage) > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                          <div className="text-sm text-gray-600">
                            Showing {((partsPage - 1) * itemsPerPage) + 1} - {Math.min(partsPage * itemsPerPage, partsTotal)} of {partsTotal}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPartsPage(prev => Math.max(1, prev - 1))}
                              disabled={partsPage === 1 || isLoading}
                            >
                              <ChevronLeft className="h-4 w-4 mr-1" />
                              Previous
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPartsPage(prev => prev + 1)}
                              disabled={partsPage >= Math.ceil(partsTotal / itemsPerPage) || isLoading}
                            >
                              Next
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="packages" className="m-0">
                <div className="border rounded-lg max-h-96 overflow-y-auto">
                  {filteredPackages.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No packages or assemblies found</div>
                  ) : (
                    <>
                      <div className="divide-y">
                        {paginatedPackages.map((pkg) => (
                          <div
                            key={pkg.id}
                            className="p-3 hover:bg-gray-50 flex items-center gap-3"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {pkg.type === 'Assembly' ? (
                                  <Box className="h-4 w-4 text-purple-600" />
                                ) : (
                                  <Package className="h-4 w-4 text-blue-600" />
                                )}
                                <div className="font-medium text-sm">{pkg.name}</div>
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  pkg.type === 'Assembly' 
                                    ? 'bg-purple-100 text-purple-700' 
                                    : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {pkg.type}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {pkg.description || 'No description'}
                              </div>
                              <div className="text-xs text-gray-600 mt-1">
                                Contains {pkg.parts.length} part{pkg.parts.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`pkg-qty-${pkg.id}`} className="text-xs text-gray-600 whitespace-nowrap">
                                Qty:
                              </Label>
                              <Input
                                id={`pkg-qty-${pkg.id}`}
                                type="number"
                                min="0"
                                value={packageQuantities[pkg.id] || ''}
                                onChange={(e) => {
                                  const qty = parseInt(e.target.value) || 0
                                  handlePackageQuantityChange(pkg.id, qty)
                                }}
                                className="w-20 h-8 text-center"
                                placeholder="0"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      {packagesTotalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                          <div className="text-sm text-gray-600">
                            Showing {packagesStartIndex + 1} - {Math.min(packagesEndIndex, filteredPackages.length)} of {filteredPackages.length}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPackagesPage(prev => Math.max(1, prev - 1))}
                              disabled={packagesPage === 1}
                            >
                              <ChevronLeft className="h-4 w-4 mr-1" />
                              Previous
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPackagesPage(prev => prev + 1)}
                              disabled={packagesPage >= packagesTotalPages}
                            >
                              Next
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>
            <div className="mt-2 text-sm text-gray-600">
              {Object.keys(partQuantities).length} part{Object.keys(partQuantities).length !== 1 ? 's' : ''} selected
              {Object.keys(packageQuantities).length > 0 && ` • ${Object.keys(packageQuantities).length} package${Object.keys(packageQuantities).length !== 1 ? 's' : ''} selected`}
              {' • Total quantity: '}
              {Object.values(partQuantities).reduce((sum, qty) => sum + qty, 0) + 
                Object.entries(packageQuantities).reduce((sum, [pkgId, qty]) => {
                  const pkg = packages.find(p => p.id === pkgId)
                  if (!pkg) return sum
                  return sum + (pkg.parts.reduce((pSum, p) => pSum + p.quantity, 0) * qty)
                }, 0)}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4 flex gap-2">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={isCreating}
            type="button"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button 
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (!isCreating && bomName.trim()) {
                handleCreate()
              }
            }}
            disabled={isCreating || !bomName.trim() || (Object.keys(partQuantities).length === 0 && Object.keys(packageQuantities).length === 0)}
            className={`flex-1 ${
              isCreating || !bomName.trim() || (Object.keys(partQuantities).length === 0 && Object.keys(packageQuantities).length === 0)
                ? 'bg-gray-400 cursor-not-allowed opacity-50' 
                : 'bg-purple-600 hover:bg-purple-700 cursor-pointer'
            } text-white`}
            type="button"
          >
            {isCreating ? 'Creating...' : 'Create BOM'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

