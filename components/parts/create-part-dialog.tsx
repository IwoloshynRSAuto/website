'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'react-hot-toast'
import { X, Plus } from 'lucide-react'

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

interface CreatePartDialogProps {
  isOpen: boolean
  onClose: () => void
  onPartCreated: () => void
}

const FORM_STORAGE_KEY = 'create-part-dialog-form'

export function CreatePartDialog({ isOpen, onClose, onPartCreated }: CreatePartDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  
  // Define form data type
  type FormData = {
    partNumber: string
    manufacturer: string
    description: string
    category: string
    subcategory: string
    primarySource: string
    purchasePrice: string
    secondarySources: string[]
  }

  // Load form data from localStorage on mount
  const loadFormData = (): FormData => {
    if (typeof window === 'undefined') {
      return {
        partNumber: '',
        manufacturer: '',
        description: '',
        category: '',
        subcategory: '',
        primarySource: '',
        purchasePrice: '',
        secondarySources: [] as string[],
      }
    }
    
    try {
      const stored = localStorage.getItem(FORM_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return {
          partNumber: parsed.partNumber || '',
          manufacturer: parsed.manufacturer || '',
          description: parsed.description || '',
          category: parsed.category || '',
          subcategory: parsed.subcategory || '',
          primarySource: parsed.primarySource || '',
          purchasePrice: parsed.purchasePrice || '',
          secondarySources: Array.isArray(parsed.secondarySources) ? parsed.secondarySources : [],
        }
      }
    } catch (e) {
      console.error('Error loading form data from localStorage:', e)
    }
    
    return {
      partNumber: '',
      manufacturer: '',
      description: '',
      category: '',
      subcategory: '',
      primarySource: '',
      purchasePrice: '',
      secondarySources: [] as string[],
    }
  }
  
  // Initialize form - try to load from localStorage immediately on mount
  const getInitialFormData = (): FormData => {
    if (typeof window === 'undefined') {
      return {
        partNumber: '',
        manufacturer: '',
        description: '',
        category: '',
        subcategory: '',
        primarySource: '',
        purchasePrice: '',
        secondarySources: [],
      }
    }
    
    try {
      const stored = localStorage.getItem(FORM_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        const loaded: FormData = {
          partNumber: parsed.partNumber || '',
          manufacturer: parsed.manufacturer || '',
          description: parsed.description || '',
          category: parsed.category || '',
          subcategory: parsed.subcategory || '',
          primarySource: parsed.primarySource || '',
          purchasePrice: parsed.purchasePrice || '',
          secondarySources: Array.isArray(parsed.secondarySources) ? parsed.secondarySources : [],
        }
        console.log('[CreatePartDialog] Initialized with data from localStorage:', loaded)
        return loaded
      }
    } catch (e) {
      console.error('[CreatePartDialog] Error loading initial form data:', e)
    }
    
    return {
      partNumber: '',
      manufacturer: '',
      description: '',
      category: '',
      subcategory: '',
      primarySource: '',
      purchasePrice: '',
      secondarySources: [],
    }
  }
  
  const [formData, setFormData] = useState<FormData>(getInitialFormData)
  const [newSecondarySource, setNewSecondarySource] = useState('')
  const isInitialMount = useRef(true)
  const skipNextSave = useRef(false)
  
  // CRITICAL: Always load from localStorage when dialog opens (this handles Fast Refresh)
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(FORM_STORAGE_KEY)
        console.log('[CreatePartDialog] Dialog opened, localStorage:', stored ? 'HAS DATA' : 'EMPTY')
        
        if (stored) {
          const parsed = JSON.parse(stored)
          const loaded: FormData = {
            partNumber: parsed.partNumber || '',
            manufacturer: parsed.manufacturer || '',
            description: parsed.description || '',
            category: parsed.category || '',
            subcategory: parsed.subcategory || '',
            primarySource: parsed.primarySource || '',
            purchasePrice: parsed.purchasePrice || '',
            secondarySources: Array.isArray(parsed.secondarySources) ? parsed.secondarySources : [],
          }
          console.log('[CreatePartDialog] ✅ Restored form data:', loaded)
          // Skip the next auto-save since we're loading from localStorage
          skipNextSave.current = true
          setFormData(loaded)
        } else {
          console.log('[CreatePartDialog] ⚠️ No saved data found')
        }
      } catch (e) {
        console.error('[CreatePartDialog] ❌ Error loading form data:', e)
      }
    }
  }, [isOpen])
  
  // DON'T clear localStorage on reload - we want data to persist during Fast Refresh
  // Only clear when user navigates away from the page (handled in parts-database-view.tsx)
  // or after successful part creation
  
  // Save form data to localStorage whenever it changes (but skip initial mount and restores)
  // This persists data during development mode Fast Refresh
  useEffect(() => {
    // Skip on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    
    // Skip if we just loaded from localStorage
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }
    
    // Always save when formData changes - this ensures persistence during Fast Refresh
    if (typeof window !== 'undefined') {
      try {
        const saved = JSON.stringify(formData)
        localStorage.setItem(FORM_STORAGE_KEY, saved)
        console.log('[CreatePartDialog] 💾 Auto-saved form data to localStorage')
      } catch (e) {
        console.error('[CreatePartDialog] Error auto-saving form data to localStorage:', e)
      }
    }
  }, [formData])
  
  // Reset form state when dialog closes (but keep localStorage for Fast Refresh)
  useEffect(() => {
    if (!isOpen) {
      // Don't reset formData - keep it in state so localStorage has the latest data
      // The restore logic will handle loading it when dialog reopens
      setNewSecondarySource('')
    }
  }, [isOpen])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    const newData = { ...formData, [name]: value }
    setFormData(newData)
    
    // ALWAYS save to localStorage immediately - this persists during Fast Refresh
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = JSON.stringify(newData)
        localStorage.setItem(FORM_STORAGE_KEY, saved)
        
        // Verify it was saved
        const verify = localStorage.getItem(FORM_STORAGE_KEY)
        if (verify) {
          console.log('[CreatePartDialog] ✅ Saved to localStorage:', { name, value: value.substring(0, 20), verified: true })
        } else {
          console.error('[CreatePartDialog] ❌ Save failed - localStorage returned null after save')
        }
      } catch (e: any) {
        console.error('[CreatePartDialog] ❌ Error saving form data to localStorage:', e)
        console.error('[CreatePartDialog] Error details:', {
          message: e.message,
          name: e.name,
          stack: e.stack
        })
      }
    } else {
      console.error('[CreatePartDialog] ❌ localStorage not available')
    }
  }

  const handleAddSecondarySource = () => {
    if (newSecondarySource.trim()) {
      const newData = {
        ...formData,
        secondarySources: [...formData.secondarySources, newSecondarySource.trim()]
      }
      setFormData(newData)
      // ALWAYS save to localStorage immediately
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(newData))
        } catch (e) {
          console.error('Error saving form data to localStorage:', e)
        }
      }
      setNewSecondarySource('')
    }
  }

  const handleRemoveSecondarySource = (index: number) => {
    const newData = {
      ...formData,
      secondarySources: formData.secondarySources.filter((_, i) => i !== index)
    }
    setFormData(newData)
    // ALWAYS save to localStorage immediately
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(newData))
      } catch (e) {
        console.error('Error saving form data to localStorage:', e)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/parts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          partNumber: formData.partNumber,
          manufacturer: formData.manufacturer,
          description: formData.description || null,
          category: formData.category || null,
          subcategory: formData.subcategory || null,
          primarySource: formData.primarySource || null,
          purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : null,
          secondarySources: formData.secondarySources.length > 0 ? formData.secondarySources : null,
        }),
      })

      if (response.ok) {
        toast.success('Part created successfully')
        // Reset form data
        const resetData = {
          partNumber: '',
          manufacturer: '',
          description: '',
          category: '',
          subcategory: '',
          primarySource: '',
          purchasePrice: '',
          secondarySources: [] as string[],
        }
        setFormData(resetData)
        setNewSecondarySource('')
        // Clear localStorage after successful creation
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem(FORM_STORAGE_KEY)
          } catch (e) {
            console.error('Error clearing form data from localStorage:', e)
          }
        }
        onPartCreated()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to create part')
      }
    } catch (error) {
      console.error('Error creating part:', error)
      toast.error('An error occurred while creating the part')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Part</DialogTitle>
          <DialogDescription>
            Create a new part entry in the database
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="partNumber">Part Number *</Label>
              <Input
                id="partNumber"
                name="partNumber"
                value={formData.partNumber}
                onChange={handleInputChange}
                required
                placeholder="e.g., VAC-001"
              />
            </div>
            <div>
              <Label htmlFor="manufacturer">Manufacturer *</Label>
              <Input
                id="manufacturer"
                name="manufacturer"
                value={formData.manufacturer}
                onChange={handleInputChange}
                required
                placeholder="e.g., Vention"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Part description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <div>
                <Select
                  value={formData.category || undefined}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.category && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, category: '' }))}
                    className="mt-2 text-xs h-6 px-2"
                  >
                    Clear selection
                  </Button>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="subcategory">Subcategory</Label>
              <Input
                id="subcategory"
                name="subcategory"
                value={formData.subcategory}
                onChange={handleInputChange}
                placeholder="Optional subcategory"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primarySource">Primary Source</Label>
              <Input
                id="primarySource"
                name="primarySource"
                value={formData.primarySource}
                onChange={handleInputChange}
                placeholder="e.g., McMaster-Carr"
              />
            </div>
            <div>
              <Label htmlFor="purchasePrice">Purchase Price</Label>
              <Input
                id="purchasePrice"
                name="purchasePrice"
                type="number"
                step="0.01"
                value={formData.purchasePrice}
                onChange={handleInputChange}
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <Label>Secondary Sources</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={newSecondarySource}
                  onChange={(e) => setNewSecondarySource(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddSecondarySource()
                    }
                  }}
                  placeholder="Add secondary source"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddSecondarySource}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.secondarySources.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.secondarySources.map((source, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm"
                    >
                      <span>{source}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSecondarySource(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Part'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

