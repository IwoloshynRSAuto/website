'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardPageContainer, DashboardHeader, DashboardContent } from '@/components/layout/dashboard-page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Save, Package, FileText, Trash2, Plus, X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Link from 'next/link'

interface Package {
  id: string
  name: string
  type: string
  description: string | null
  quantity: number
}

interface Part {
  id: string
  partNumber: string
  manufacturer: string
  description: string | null
  category: string | null
  subcategory: string | null
  primarySource: string | null
  secondarySources: string[]
  purchasePrice: number | null
  packages: Package[]
}

interface PartDetailPageProps {
  part: Part
}

export function PartDetailPage({ part: initialPart }: PartDetailPageProps) {
  const router = useRouter()
  const [part, setPart] = useState(initialPart)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    partNumber: initialPart.partNumber,
    manufacturer: initialPart.manufacturer,
    description: initialPart.description || '',
    category: initialPart.category || '',
    subcategory: initialPart.subcategory || '',
    primarySource: initialPart.primarySource || '',
    purchasePrice: initialPart.purchasePrice?.toString() || '',
    secondarySources: initialPart.secondarySources || [],
  })
  const [newSecondarySource, setNewSecondarySource] = useState('')

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/parts/${part.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partNumber: formData.partNumber,
          manufacturer: formData.manufacturer,
          description: formData.description || null,
          category: formData.category || null,
          subcategory: formData.subcategory || null,
          primarySource: formData.primarySource || null,
          secondarySources: formData.secondarySources.length > 0 ? formData.secondarySources : null,
          purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : null,
        }),
      })

      if (response.ok) {
        const updatedPart = await response.json()
        setPart({
          ...updatedPart,
          secondarySources: updatedPart.secondarySources ? JSON.parse(updatedPart.secondarySources) : [],
          packages: part.packages, // Preserve packages
        })
        setIsEditing(false)
        toast.success('Part updated successfully')
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

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete part ${part.partNumber}? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/parts/${part.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Part deleted successfully')
        router.push('/dashboard/parts/database')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete part')
      }
    } catch (error) {
      console.error('Error deleting part:', error)
      toast.error('An error occurred while deleting the part')
    }
  }

  const addSecondarySource = () => {
    if (newSecondarySource.trim() && !formData.secondarySources.includes(newSecondarySource.trim())) {
      setFormData(prev => ({
        ...prev,
        secondarySources: [...prev.secondarySources, newSecondarySource.trim()]
      }))
      setNewSecondarySource('')
    }
  }

  const removeSecondarySource = (index: number) => {
    setFormData(prev => ({
      ...prev,
      secondarySources: prev.secondarySources.filter((_, i) => i !== index)
    }))
  }

  return (
    <DashboardPageContainer>
      <DashboardHeader
        title={part.partNumber}
        subtitle={part.manufacturer}
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push('/dashboard/parts/database')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          {!isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
              <Button variant="outline" onClick={handleDelete} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => {
                setIsEditing(false)
                setFormData({
                  partNumber: part.partNumber,
                  manufacturer: part.manufacturer,
                  description: part.description || '',
                  category: part.category || '',
                  subcategory: part.subcategory || '',
                  primarySource: part.primarySource || '',
                  purchasePrice: part.purchasePrice?.toString() || '',
                  secondarySources: part.secondarySources || [],
                })
              }}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl">
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </>
          )}
        </div>
      </DashboardHeader>

      <DashboardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Part Number</Label>
                  {isEditing ? (
                    <Input
                      value={formData.partNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, partNumber: e.target.value }))}
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 text-gray-900 font-medium">{part.partNumber}</p>
                  )}
                </div>

                <div>
                  <Label>Manufacturer</Label>
                  {isEditing ? (
                    <Input
                      value={formData.manufacturer}
                      onChange={(e) => setFormData(prev => ({ ...prev, manufacturer: e.target.value }))}
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 text-gray-900">{part.manufacturer}</p>
                  )}
                </div>

                <div>
                  <Label>Description</Label>
                  {isEditing ? (
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="mt-1"
                      rows={3}
                    />
                  ) : (
                    <p className="mt-1 text-gray-600">{part.description || 'No description'}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    {isEditing ? (
                      <div>
                        <Select
                          value={formData.category || undefined}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                        >
                          <SelectTrigger className="mt-1">
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
                    ) : (
                      <p className="mt-1 text-gray-600">{part.category || 'Not specified'}</p>
                    )}
                  </div>
                  <div>
                    <Label>Subcategory</Label>
                    {isEditing ? (
                      <Input
                        value={formData.subcategory}
                        onChange={(e) => setFormData(prev => ({ ...prev, subcategory: e.target.value }))}
                        className="mt-1"
                        placeholder="Optional subcategory"
                      />
                    ) : (
                      <p className="mt-1 text-gray-600">{part.subcategory || 'Not specified'}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Primary Source</Label>
                  {isEditing ? (
                    <Input
                      value={formData.primarySource}
                      onChange={(e) => setFormData(prev => ({ ...prev, primarySource: e.target.value }))}
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 text-gray-600">{part.primarySource || 'Not specified'}</p>
                  )}
                </div>

                <div>
                  <Label>Purchase Price</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.purchasePrice}
                      onChange={(e) => setFormData(prev => ({ ...prev, purchasePrice: e.target.value }))}
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 text-gray-900 font-medium">
                      {part.purchasePrice ? `$${part.purchasePrice.toFixed(2)}` : 'Not set'}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Secondary Sources</Label>
                  {isEditing ? (
                    <div className="mt-1 space-y-2">
                      <div className="flex gap-2">
                        <Input
                          value={newSecondarySource}
                          onChange={(e) => setNewSecondarySource(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addSecondarySource()}
                          placeholder="Add secondary source"
                        />
                        <Button onClick={addSecondarySource} size="sm">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.secondarySources.map((source, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {source}
                            <button
                              type="button"
                              onClick={() => removeSecondarySource(index)}
                              className="ml-1 hover:text-red-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {part.secondarySources && part.secondarySources.length > 0 ? (
                        part.secondarySources.map((source, index) => (
                          <Badge key={index} variant="secondary">
                            {source}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-gray-500">No secondary sources</span>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Packages */}
            <Card>
              <CardHeader>
                <CardTitle>Packages / Assemblies</CardTitle>
              </CardHeader>
              <CardContent>
                {part.packages && part.packages.length > 0 ? (
                  <div className="space-y-2">
                    {part.packages.map((pkg) => (
                      <Link
                        key={pkg.id}
                        href={`/dashboard/parts/packages/${pkg.id}`}
                        className="block p-3 border rounded-md hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="font-medium text-blue-600">{pkg.name}</div>
                              <Badge variant="secondary" className="text-xs">
                                {pkg.type || 'Package'}
                              </Badge>
                              {pkg.quantity > 1 && (
                                <Badge variant="outline" className="text-xs">
                                  Qty: {pkg.quantity}
                                </Badge>
                              )}
                            </div>
                            {pkg.description && (
                              <div className="text-sm text-gray-500 mt-1">{pkg.description}</div>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">This part is not in any packages or assemblies</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href={`/dashboard/parts/packages/new?addPart=${part.id}`}>
                    <Package className="h-4 w-4 mr-2" />
                    Add to Package
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href={`/dashboard/parts/assemblies/new?addPart=${part.id}`}>
                    <FileText className="h-4 w-4 mr-2" />
                    Add to BOM
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardContent>
    </DashboardPageContainer>
  )
}

