'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'react-hot-toast'
import { X, Plus, Search, Trash2, Edit } from 'lucide-react'

interface Part {
  id: string
  partNumber: string
  manufacturer: string
  description: string | null
  primarySource: string | null
  secondarySources: string[] | undefined
  purchasePrice: number | null
  relatedParts?: Array<{
    id: string
    partNumber: string
    manufacturer: string
    description: string | null
  }>
}

interface ViewPartDialogProps {
  part: Part
  isOpen: boolean
  onClose: () => void
  onPartUpdated: () => void
}

export function ViewPartDialog({ part, isOpen, onClose, onPartUpdated }: ViewPartDialogProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    partNumber: part.partNumber,
    manufacturer: part.manufacturer,
    description: part.description || '',
    primarySource: part.primarySource || '',
    purchasePrice: part.purchasePrice?.toString() || '',
    secondarySources: part.secondarySources ? [...part.secondarySources] : [],
  })
  const [newSecondarySource, setNewSecondarySource] = useState('')
  
  // Related parts management
  const [availableParts, setAvailableParts] = useState<Array<{ id: string; partNumber: string; manufacturer: string }>>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  // Reset form when part changes
  useEffect(() => {
    if (part) {
      setFormData({
        partNumber: part.partNumber,
        manufacturer: part.manufacturer,
        description: part.description || '',
        primarySource: part.primarySource || '',
        purchasePrice: part.purchasePrice?.toString() || '',
        secondarySources: part.secondarySources ? [...part.secondarySources] : [],
      })
      setIsEditing(false)
    }
  }, [part])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleAddSecondarySource = () => {
    if (newSecondarySource.trim() && !formData.secondarySources.includes(newSecondarySource.trim())) {
      setFormData(prev => ({
        ...prev,
        secondarySources: [...prev.secondarySources, newSecondarySource.trim()]
      }))
      setNewSecondarySource('')
    }
  }

  const handleRemoveSecondarySource = (index: number) => {
    setFormData(prev => ({
      ...prev,
      secondarySources: prev.secondarySources.filter((_, i) => i !== index)
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/parts/${part.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          partNumber: formData.partNumber,
          manufacturer: formData.manufacturer,
          description: formData.description || null,
          primarySource: formData.primarySource || null,
          purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : null,
          secondarySources: formData.secondarySources.length > 0 ? formData.secondarySources : null,
        }),
      })

      if (response.ok) {
        toast.success('Part updated successfully')
        setIsEditing(false)
        onPartUpdated()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update part')
      }
    } catch (error) {
      console.error('Error updating part:', error)
      toast.error('An error occurred while updating the part')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddRelatedPart = async (relatedPartId: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/parts/${part.id}/relations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ relatedPartId }),
      })

      if (response.ok) {
        toast.success('Related part added successfully')
        onPartUpdated()
        setSearchQuery('')
        setAvailableParts([])
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to add related part')
      }
    } catch (error) {
      console.error('Error adding related part:', error)
      toast.error('An error occurred while adding related part')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveRelatedPart = async (relatedPartId: string) => {
    if (!confirm('Are you sure you want to remove this related part?')) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/parts/${part.id}/relations?relatedPartId=${relatedPartId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Related part removed successfully')
        onPartUpdated()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to remove related part')
      }
    } catch (error) {
      console.error('Error removing related part:', error)
      toast.error('An error occurred while removing related part')
    } finally {
      setIsLoading(false)
    }
  }

  const searchParts = async (query: string) => {
    if (!query.trim()) {
      setAvailableParts([])
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/parts?search=${encodeURIComponent(query)}&limit=10`)
      if (response.ok) {
        const data = await response.json()
        // Filter out the current part and already related parts
        const relatedPartIds = new Set((part.relatedParts || []).map(rp => rp.id))
        relatedPartIds.add(part.id)
        
        const filtered = data.parts.filter((p: any) => !relatedPartIds.has(p.id))
        setAvailableParts(filtered)
      }
    } catch (error) {
      console.error('Error searching parts:', error)
    } finally {
      setIsSearching(false)
    }
  }

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchParts(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{isEditing ? 'Edit Part' : 'View Part'}</DialogTitle>
              <DialogDescription>
                {isEditing ? 'Update part information' : 'Part details and related components'}
              </DialogDescription>
            </div>
            {!isEditing && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="partNumber">Part Number {isEditing && '*'}</Label>
                {isEditing ? (
                  <Input
                    id="partNumber"
                    name="partNumber"
                    value={formData.partNumber}
                    onChange={handleInputChange}
                    required
                  />
                ) : (
                  <p className="text-sm text-gray-900 font-medium">{part.partNumber}</p>
                )}
              </div>
              <div>
                <Label htmlFor="manufacturer">Manufacturer {isEditing && '*'}</Label>
                {isEditing ? (
                  <Input
                    id="manufacturer"
                    name="manufacturer"
                    value={formData.manufacturer}
                    onChange={handleInputChange}
                    required
                  />
                ) : (
                  <p className="text-sm text-gray-900 font-medium">{part.manufacturer}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              {isEditing ? (
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                />
              ) : (
                <p className="text-sm text-gray-900">{part.description || <span className="text-gray-400">No description</span>}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primarySource">Primary Source</Label>
                {isEditing ? (
                  <Input
                    id="primarySource"
                    name="primarySource"
                    value={formData.primarySource}
                    onChange={handleInputChange}
                  />
                ) : (
                  <p className="text-sm text-gray-900">{part.primarySource || <span className="text-gray-400">-</span>}</p>
                )}
              </div>
              <div>
                <Label htmlFor="purchasePrice">Purchase Price</Label>
                {isEditing ? (
                  <Input
                    id="purchasePrice"
                    name="purchasePrice"
                    type="number"
                    step="0.01"
                    value={formData.purchasePrice}
                    onChange={handleInputChange}
                  />
                ) : (
                  <p className="text-sm text-gray-900 font-medium">
                    {part.purchasePrice !== null ? `$${part.purchasePrice.toFixed(2)}` : <span className="text-gray-400">-</span>}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Secondary Sources */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-semibold">Secondary Sources</h3>
            {isEditing ? (
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
                  <div className="flex flex-wrap gap-2">
                    {formData.secondarySources.map((source, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {source}
                        <button
                          type="button"
                          onClick={() => handleRemoveSecondarySource(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(part.secondarySources && part.secondarySources.length > 0) ? (
                  part.secondarySources.map((source, index) => (
                    <Badge key={index} variant="secondary">
                      {source}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-gray-400">No secondary sources</p>
                )}
              </div>
            )}
          </div>

          {/* Related Parts */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-semibold">Related Parts</h3>
            
            {/* Search and Add Related Part */}
            <div className="space-y-2">
              <Label>Add Related Part</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by part number or manufacturer..."
                  className="pl-10"
                />
              </div>
              {isSearching && (
                <p className="text-sm text-gray-500">Searching...</p>
              )}
              {availableParts.length > 0 && (
                <div className="border rounded-md max-h-48 overflow-y-auto">
                  {availableParts.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 border-b last:border-b-0"
                    >
                      <div>
                        <p className="font-medium text-sm">{p.partNumber}</p>
                        <p className="text-xs text-gray-500">{p.manufacturer}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddRelatedPart(p.id)}
                        disabled={isLoading}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Existing Related Parts */}
            <div>
              <Label>Current Related Parts</Label>
              {(part.relatedParts && part.relatedParts.length > 0) ? (
                <div className="space-y-2 mt-2">
                  {part.relatedParts?.map((relatedPart) => (
                    <div
                      key={relatedPart.id}
                      className="flex items-center justify-between p-3 border rounded-md hover:bg-gray-50"
                    >
                      <div>
                        <p className="font-medium text-sm">{relatedPart.partNumber}</p>
                        <p className="text-xs text-gray-500">
                          {relatedPart.manufacturer}
                          {relatedPart.description && ` • ${relatedPart.description}`}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveRelatedPart(relatedPart.id)}
                        disabled={isLoading}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 mt-2">No related parts</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

