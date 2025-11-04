'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardPageContainer, DashboardHeader, DashboardContent } from '@/components/layout/dashboard-page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Save, FileText, Trash2, Plus, Package } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import { format } from 'date-fns'

interface Part {
  id: string
  partNumber: string
  manufacturer: string
  description: string | null
  purchasePrice: number | null
  quantity?: number
  secondarySources?: string[]
  relatedParts?: Array<{
    id: string
    partNumber: string
    manufacturer: string
    description: string | null
  }>
}

interface PackageData {
  id: string
  name: string
  description: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  parts: Part[]
}

interface PackageDetailPageProps {
  packageData: PackageData
}

export function PackageDetailPage({ packageData: initialPackage }: PackageDetailPageProps) {
  const router = useRouter()
  const [packageData, setPackageData] = useState(initialPackage)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: initialPackage.name,
    description: initialPackage.description || '',
    notes: initialPackage.notes || '',
  })

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/packages/${packageData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          notes: formData.notes || null,
        }),
      })

      if (response.ok) {
        const updatedPackage = await response.json()
        setPackageData({
          ...updatedPackage,
          parts: packageData.parts, // Preserve parts
          createdAt: packageData.createdAt,
          updatedAt: packageData.updatedAt,
        })
        setIsEditing(false)
        toast.success('Package updated successfully')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update package')
      }
    } catch (error) {
      console.error('Error updating package:', error)
      toast.error('An error occurred while updating the package')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete package "${packageData.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/packages/${packageData.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Package deleted successfully')
        router.push('/dashboard/parts/packages')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete package')
      }
    } catch (error) {
      console.error('Error deleting package:', error)
      toast.error('An error occurred while deleting the package')
    }
  }

  const handleRemovePart = async (partId: string) => {
    if (!confirm('Remove this part from the package?')) {
      return
    }

    try {
      const response = await fetch(`/api/packages/${packageData.id}/parts?partId=${partId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Part removed from package')
        // Refresh package data
        const updated = await fetch(`/api/packages/${packageData.id}`).then(r => r.json())
        setPackageData(updated)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to remove part')
      }
    } catch (error) {
      console.error('Error removing part:', error)
      toast.error('An error occurred while removing the part')
    }
  }

  const handleConvertToBOM = async () => {
    try {
      const response = await fetch('/api/boms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${packageData.name} (BOM)`,
          partIds: packageData.parts.map(p => p.id),
        }),
      })

      if (response.ok) {
        const newBOM = await response.json()
        toast.success('Package converted to BOM successfully')
        router.push(`/dashboard/parts/assemblies/${newBOM.id}`)
      } else {
        throw new Error('Failed to convert package to BOM')
      }
    } catch (error) {
      console.error('Error converting package to BOM:', error)
      toast.error('Failed to convert package to BOM')
    }
  }

  return (
    <DashboardPageContainer>
      <DashboardHeader
        title={packageData.name}
        subtitle={`Created ${format(new Date(packageData.createdAt), 'MMM d, yyyy')}`}
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push('/dashboard/parts/packages')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          {!isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
              <Button variant="outline" onClick={handleConvertToBOM} className="text-blue-600 hover:text-blue-700">
                <FileText className="h-4 w-4 mr-2" />
                Convert to BOM
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
                  name: packageData.name,
                  description: packageData.description || '',
                  notes: packageData.notes || '',
                })
              }}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
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
                <CardTitle>Package Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Package Name</Label>
                  {isEditing ? (
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 text-gray-900 font-medium">{packageData.name}</p>
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
                    <p className="mt-1 text-gray-600">{packageData.description || 'No description'}</p>
                  )}
                </div>

                <div>
                  <Label>Notes</Label>
                  {isEditing ? (
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      className="mt-1"
                      rows={3}
                    />
                  ) : (
                    <p className="mt-1 text-gray-600">{packageData.notes || 'No notes'}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Parts in Package */}
            <Card>
              <CardHeader>
                <CardTitle>Parts in Package ({packageData.parts.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {packageData.parts.length === 0 ? (
                  <p className="text-gray-500">No parts in this package</p>
                ) : (
                  <div className="space-y-2">
                    {packageData.parts.map((part) => (
                      <div
                        key={part.id}
                        className="flex items-center justify-between p-3 border rounded-md hover:bg-gray-50"
                      >
                        <Link
                          href={`/dashboard/parts/database/${part.id}`}
                          className="flex-1"
                        >
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-blue-600">{part.partNumber}</div>
                            {part.quantity !== undefined && part.quantity > 1 && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                Qty: {part.quantity}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">{part.manufacturer}</div>
                          {part.description && (
                            <div className="text-sm text-gray-500 mt-1">{part.description}</div>
                          )}
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemovePart(part.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
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
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push(`/dashboard/parts/packages/${packageData.id}/add-part`)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Parts
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleConvertToBOM}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Convert to BOM
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardContent>
    </DashboardPageContainer>
  )
}

