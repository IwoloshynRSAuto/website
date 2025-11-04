'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'react-hot-toast'
import { Search, Plus, X } from 'lucide-react'

const FORM_STORAGE_KEY = 'create-package-dialog-form'

interface Part {
  id: string
  partNumber: string
  manufacturer: string
  description: string | null
  purchasePrice: number | null
}

interface CreatePackageDialogProps {
  isOpen: boolean
  onClose: () => void
  onPackageCreated: () => void
}

export function CreatePackageDialog({ isOpen, onClose, onPackageCreated }: CreatePackageDialogProps) {
  // Load initial form data from localStorage
  const loadFormData = () => {
    if (typeof window === 'undefined') {
      return {
        packageName: '',
        packageType: 'Package' as 'Package' | 'Assembly',
        description: '',
        partQuantities: {} as Record<string, number>,
        searchTerm: '',
      }
    }
    
    try {
      const stored = localStorage.getItem(FORM_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return {
          packageName: parsed.packageName || '',
          packageType: parsed.packageType || 'Package',
          description: parsed.description || '',
          partQuantities: parsed.partQuantities || {},
          searchTerm: parsed.searchTerm || '',
        }
      }
    } catch (e) {
      console.error('[CreatePackageDialog] Error loading form data:', e)
    }
    
    return {
      packageName: '',
      packageType: 'Package' as 'Package' | 'Assembly',
      description: '',
      partQuantities: {} as Record<string, number>,
      searchTerm: '',
    }
  }
  
  const initialData = loadFormData()
  const [packageName, setPackageName] = useState(initialData.packageName)
  const [packageType, setPackageType] = useState<'Package' | 'Assembly'>(initialData.packageType)
  const [description, setDescription] = useState(initialData.description)
  const [parts, setParts] = useState<Part[]>([])
  const [partQuantities, setPartQuantities] = useState<Record<string, number>>(initialData.partQuantities)
  const [searchTerm, setSearchTerm] = useState(initialData.searchTerm)
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const isInitialMount = useRef(true)
  const skipNextSave = useRef(false)

  // Load form data from localStorage when dialog opens
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(FORM_STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          setPackageName(parsed.packageName || '')
          setPackageType(parsed.packageType || 'Package')
          setDescription(parsed.description || '')
          setPartQuantities(parsed.partQuantities || {})
          setSearchTerm(parsed.searchTerm || '')
          skipNextSave.current = true
          console.log('[CreatePackageDialog] ✅ Restored form data from localStorage')
        }
        fetchParts()
      } catch (e) {
        console.error('[CreatePackageDialog] ❌ Error loading form data:', e)
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
          packageName,
          packageType,
          description,
          partQuantities,
          searchTerm,
        }
        localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(formData))
        console.log('[CreatePackageDialog] 💾 Auto-saved form data to localStorage')
      } catch (e) {
        console.error('[CreatePackageDialog] Error saving form data:', e)
      }
    }
  }, [packageName, packageType, description, partQuantities, searchTerm, isOpen])

  const fetchParts = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/parts?limit=500')
      if (response.ok) {
        const data = await response.json()
        setParts(data.parts || [])
      }
    } catch (error) {
      console.error('Error fetching parts:', error)
      toast.error('Failed to load parts')
    } finally {
      setIsLoading(false)
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

  const handleCreate = async () => {
    if (!packageName.trim()) {
      toast.error('Please enter a package name')
      return
    }

    setIsCreating(true)
    try {
      const partIds = Object.keys(partQuantities).filter(id => partQuantities[id] > 0)
      
      const requestBody = {
        name: packageName.trim(),
        type: packageType,
        description: description.trim() || null,
        partIds,
        partQuantities: partIds.reduce((acc, id) => {
          acc[id] = partQuantities[id]
          return acc
        }, {} as Record<string, number>),
      }
      
      console.log('Creating package with data:', requestBody)
      
      const response = await fetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        toast.success(packageType === 'Assembly' ? 'Completed Assembly created successfully' : 'Package created successfully')
        
        // Clear localStorage after successful creation
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem(FORM_STORAGE_KEY)
            console.log('[CreatePackageDialog] ✅ Cleared form data after successful package creation')
          } catch (e) {
            console.error('[CreatePackageDialog] Error clearing form data:', e)
          }
        }
        
        // Reset form state
        setPackageName('')
        setPackageType('Package')
        setDescription('')
        setPartQuantities({})
        setSearchTerm('')
        
        onPackageCreated()
        onClose()
      } else {
        const errorData = await response.json()
        console.error('API Error Response:', errorData)
        
        // Extract error message from different possible formats
        let errorMessage = 'Failed to create package'
        if (errorData.details) {
          errorMessage = `Validation error: ${errorData.details}`
        } else if (errorData.error) {
          if (typeof errorData.error === 'string') {
            errorMessage = errorData.error
          } else if (errorData.error.message) {
            errorMessage = errorData.error.message
          } else {
            errorMessage = JSON.stringify(errorData.error)
          }
        }
        
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error('Error creating package:', error)
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while creating the package'
      toast.error(errorMessage)
    } finally {
      setIsCreating(false)
    }
  }

  const filteredParts = parts.filter(part => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      part.partNumber.toLowerCase().includes(search) ||
      part.manufacturer.toLowerCase().includes(search) ||
      (part.description?.toLowerCase().includes(search) ?? false)
    )
  })

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && !isCreating) {
        onClose()
      }
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle>Create New Package</DialogTitle>
          <DialogDescription>
            Group related parts together for easier management
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-y-auto min-h-0 pr-2">
          <div>
            <Label htmlFor="package-name">Package Name <span className="text-red-500">*</span></Label>
            <Input
              id="package-name"
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              placeholder="e.g., Starter Kit - Basic Components"
              className="mt-1"
              required
            />
            {!packageName.trim() && (
              <p className="text-xs text-red-500 mt-1">Package name is required to create</p>
            )}
          </div>

          <div>
            <Label htmlFor="package-type">Type</Label>
            <Select value={packageType} onValueChange={(value: 'Package' | 'Assembly') => setPackageType(value)}>
              <SelectTrigger id="package-type" className="mt-1 h-10 w-full">
                <SelectValue>
                  {packageType === 'Assembly' ? 'Completed Assembly' : 'Package'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="min-w-[300px]">
                <SelectItem value="Package" className="py-3">
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-medium text-sm">Package</span>
                    <span className="text-xs text-gray-500 font-normal">Reusable group of parts</span>
                  </div>
                </SelectItem>
                <SelectItem value="Assembly" className="py-3">
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-medium text-sm">Completed Assembly</span>
                    <span className="text-xs text-gray-500 font-normal">Finalized, production-ready configuration</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="package-description">Description</Label>
            <Textarea
              id="package-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              className="mt-1"
              rows={2}
            />
          </div>

          <div>
            <Label>Select Parts</Label>
            <div className="relative mt-1 mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search parts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="border rounded-lg max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center text-gray-500">Loading parts...</div>
              ) : filteredParts.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No parts found</div>
              ) : (
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
              )}
            </div>
            <div className="mt-2 text-sm text-gray-600">
              {Object.keys(partQuantities).length} part{Object.keys(partQuantities).length !== 1 ? 's' : ''} selected • 
              Total quantity: {Object.values(partQuantities).reduce((sum, qty) => sum + qty, 0)}
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
              if (!isCreating && packageName.trim()) {
                handleCreate()
              }
            }}
            disabled={isCreating || !packageName.trim()}
            className={`flex-1 ${
              isCreating || !packageName.trim() 
                ? 'bg-gray-400 cursor-not-allowed opacity-50' 
                : 'bg-purple-600 hover:bg-purple-700 cursor-pointer'
            } text-white`}
            type="button"
          >
            {isCreating 
              ? 'Creating...' 
              : packageType === 'Assembly' 
                ? 'Create Completed Assembly' 
                : 'Create New Package'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

