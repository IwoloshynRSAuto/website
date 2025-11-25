'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { DashboardPageContainer, DashboardHeader, DashboardContent } from '@/components/layout/dashboard-page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Edit, Save, X, Upload, AlertTriangle, ExternalLink, Trash2 } from 'lucide-react'
import { ebayApi } from '@/lib/ebay-api'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import { format } from 'date-fns'

export default function ListingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [listing, setListing] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState<any>({})
  const [categories, setCategories] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (params.id) {
      loadData()
    }
    loadSettings()
  }, [params.id])

  async function loadSettings() {
    try {
      const [catRes, locRes] = await Promise.all([
        ebayApi.settings.getCategories(),
        ebayApi.settings.getLocations()
      ])
      setCategories(catRes.data.data || [])
      setLocations(locRes.data.data || [])
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  async function loadData() {
    try {
      setLoading(true)
      const response = await ebayApi.listings.getById(params.id as string)
      const listingData = response.data.data
      setListing(listingData)
      setEditData({
        title: listingData.title || '',
        description: listingData.description || '',
        categoryId: listingData.categoryId || '',
        storageLocationId: listingData.storageLocationId || '',
        condition: listingData.conditionText || '',
        testStatus: listingData.testStatus || '',
        notes: listingData.notes || '',
        listingStatus: listingData.listingStatus || 'draft'
      })
    } catch (error: any) {
      console.error('Error loading listing:', error)
      toast.error('Failed to load listing')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    try {
      setLoading(true)
      await ebayApi.listings.update(params.id as string, editData)
      setEditing(false)
      await loadData()
      toast.success('Listing updated successfully')
    } catch (error: any) {
      console.error('Error saving:', error)
      toast.error('Failed to save changes')
    } finally {
      setLoading(false)
    }
  }

  async function handleUploadToEbay() {
    try {
      setUploading(true)
      const response = await fetch(`/api/ebay/listings/${params.id}/draft`, {
        method: 'POST'
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create draft')
      }
      toast.success('Draft listing structure created (eBay API not connected yet)')
      await loadData()
    } catch (error: any) {
      console.error('Error uploading to eBay:', error)
      toast.error('Failed to create draft listing')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this listing? This action cannot be undone.')) {
      return
    }

    try {
      setDeleting(true)
      await ebayApi.listings.delete(params.id as string)
      toast.success('Listing deleted')
      router.push('/dashboard/ebay')
    } catch (error: any) {
      console.error('Error deleting:', error)
      toast.error('Failed to delete listing')
    } finally {
      setDeleting(false)
    }
  }

  if (loading && !listing) {
    return (
      <DashboardPageContainer>
        <DashboardContent>
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-cyan-600 border-t-transparent"></div>
            <p className="text-gray-600 mt-4">Loading listing...</p>
          </div>
        </DashboardContent>
      </DashboardPageContainer>
    )
  }

  if (!listing) {
    return (
      <DashboardPageContainer>
        <DashboardContent>
          <div className="text-center py-12">
            <p className="text-gray-600">Listing not found</p>
            <Link href="/dashboard/ebay">
              <Button className="mt-4">Back to Dashboard</Button>
            </Link>
          </div>
        </DashboardContent>
      </DashboardPageContainer>
    )
  }

  const needsAgingAlert = listing.daysSinceCreated > 100
  const needsInspectionAlert = listing.needsInspection || 
    listing.needsTesting ||
    listing.conditionText?.toLowerCase().includes('needs inspection') ||
    listing.testStatus?.toLowerCase().includes('needs testing')

  return (
    <DashboardPageContainer>
      <DashboardHeader
        title={listing.title || 'Untitled Listing'}
        subtitle={`Listing ${listing.code} • Created ${format(new Date(listing.createdAt), 'MMM d, yyyy')}`}
      >
        <div className="flex items-center gap-2">
          <Link href="/dashboard/ebay">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          {!editing ? (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => { setEditing(false); setEditData({}); loadData() }}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </>
          )}
          <Button
            variant="outline"
            onClick={handleUploadToEbay}
            disabled={uploading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? 'Creating Draft...' : 'Create Draft Listing'}
          </Button>
          <Button
            variant="outline"
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </DashboardHeader>
      <DashboardContent>
        <div className="space-y-6">
          {/* Alerts */}
          {(needsAgingAlert || needsInspectionAlert) && (
            <Card className={`${needsAgingAlert ? 'border-yellow-500 bg-yellow-50' : ''} ${needsInspectionAlert ? 'border-red-500 bg-red-50' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  {needsAgingAlert && (
                    <p className="text-sm font-medium text-yellow-800">
                      This listing is {listing.daysSinceCreated} days old. Consider reviewing or archiving.
                    </p>
                  )}
                  {needsInspectionAlert && (
                    <p className="text-sm font-medium text-red-800">
                      This listing needs inspection or testing before listing.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Images */}
          {listing.images && listing.images.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Images ({listing.images.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {listing.images.map((image: any, index: number) => (
                    <div key={image.id} className="relative">
                      <img
                        src={image.url.startsWith('http') ? image.url : `/api/ebay/listings/${listing.id}/images/${image.filename}`}
                        alt={`Image ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg border border-gray-200"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Listing Details */}
          <Card>
            <CardHeader>
              <CardTitle>Listing Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Listing Code</Label>
                  <Input value={listing.code} disabled className="font-mono" />
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-2">
                    <Badge variant="secondary">
                      {listing.listingStatus || 'draft'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="title">Title {editing && '*'}</Label>
                {editing ? (
                  <Input
                    id="title"
                    value={editData.title}
                    onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                ) : (
                  <p className="mt-2 text-gray-900">{listing.title || 'Untitled'}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                {editing ? (
                  <Textarea
                    id="description"
                    value={editData.description || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                  />
                ) : (
                  <p className="mt-2 text-gray-600">{listing.description || 'No description'}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="categoryId">Category</Label>
                  {editing ? (
                    <Select
                      value={editData.categoryId || 'none'}
                      onValueChange={(value) => setEditData(prev => ({ ...prev, categoryId: value === 'none' ? '' : value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="mt-2 text-gray-600">{listing.category?.name || 'No category'}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="storageLocationId">Storage Location</Label>
                  {editing ? (
                    <Select
                      value={editData.storageLocationId || 'none'}
                      onValueChange={(value) => setEditData(prev => ({ ...prev, storageLocationId: value === 'none' ? '' : value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {locations.map(loc => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="mt-2 text-gray-600">{listing.storageLocation?.name || listing.location || 'No location'}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="condition">Condition</Label>
                  {editing ? (
                    <Input
                      id="condition"
                      value={editData.condition || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, condition: e.target.value }))}
                    />
                  ) : (
                    <p className="mt-2 text-gray-600">{listing.conditionText || 'No condition specified'}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="testStatus">Test Status</Label>
                  {editing ? (
                    <Select
                      value={editData.testStatus || 'none'}
                      onValueChange={(value) => setEditData(prev => ({ ...prev, testStatus: value === 'none' ? '' : value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="Needs Testing">Needs Testing</SelectItem>
                        <SelectItem value="Tested Working">Tested Working</SelectItem>
                        <SelectItem value="Needs Repair">Needs Repair</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="mt-2 text-gray-600">{listing.testStatus || 'No test status'}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                {editing ? (
                  <Textarea
                    id="notes"
                    value={editData.notes || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                  />
                ) : (
                  <p className="mt-2 text-gray-600">{listing.notes || 'No notes'}</p>
                )}
              </div>

              {/* AI Analysis */}
              {listing.aiAnalysis && (
                <div className="border-t pt-4">
                  <Label>AI Analysis (Stub)</Label>
                  <div className="mt-2 space-y-2 text-sm">
                    <p><strong>Auto Title:</strong> {listing.aiAnalysis.autoTitle || 'N/A'}</p>
                    <p><strong>Auto Category:</strong> {listing.aiAnalysis.autoCategory || 'N/A'}</p>
                    <p><strong>Auto Description:</strong> {listing.aiAnalysis.autoDescription || 'N/A'}</p>
                    {listing.aiAnalysis.message && (
                      <p className="text-gray-500 italic">{listing.aiAnalysis.message}</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardContent>
    </DashboardPageContainer>
  )
}

