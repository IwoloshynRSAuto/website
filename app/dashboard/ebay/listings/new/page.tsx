'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardPageContainer, DashboardHeader, DashboardContent } from '@/components/layout/dashboard-page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, X, Loader, CheckCircle, ArrowLeft, Camera } from 'lucide-react'
import { ebayApi } from '@/lib/ebay-api'
import { toast } from 'react-hot-toast'
import Link from 'next/link'

export default function NewListingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [listingId, setListingId] = useState<string | null>(null)
  const [listingCode, setListingCode] = useState('')
  const [generatedTitle, setGeneratedTitle] = useState('')
  const [locations, setLocations] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [conditions, setConditions] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    title: '',
    categoryId: '',
    storageLocationId: '',
    conditionId: '',
    testStatus: '',
    notes: ''
  })

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      const [locRes, catRes, condRes] = await Promise.all([
        ebayApi.settings.getLocations(),
        ebayApi.settings.getCategories(),
        ebayApi.settings.getConditions()
      ])
      setLocations(locRes.data.data || [])
      setCategories(catRes.data.data || [])
      setConditions(condRes.data.data || [])
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    setSelectedFiles(prev => [...prev, ...files].slice(0, 10))
    // Reset input so same file can be selected again
    if (e.target) {
      e.target.value = ''
    }
  }

  function handleFileInputClick() {
    fileInputRef.current?.click()
  }

  function handleCameraClick() {
    cameraInputRef.current?.click()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    setSelectedFiles(prev => [...prev, ...files].slice(0, 10))
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  function removeFile(index: number) {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  async function handleUploadAndGenerate() {
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one image')
      return
    }

    if (selectedFiles.length > 10) {
      toast.error('Maximum 10 images allowed')
      return
    }

    try {
      setLoading(true)
      const formData = new FormData()
      selectedFiles.forEach(file => {
        formData.append('images', file)
      })

      const response = await ebayApi.listings.create(formData)

      const { id, code, title, imageCount } = response.data.data
      setListingId(id)
      setListingCode(code)
      setGeneratedTitle(title)
      setFormData(prev => ({ ...prev, title: title }))
      setStep(2)
      toast.success('Listing created! Now add details.')
    } catch (error: any) {
      console.error('Error creating listing:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create listing'
      toast.error(`Failed to create listing: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveListing() {
    if (!listingId) {
      toast.error('Listing ID missing')
      return
    }

    try {
      setLoading(true)
      await ebayApi.listings.update(listingId, {
        title: formData.title,
        categoryId: formData.categoryId || null,
        storageLocationId: formData.storageLocationId || null,
        conditionId: formData.conditionId || null,
        testStatus: formData.testStatus,
        notes: formData.notes,
        listingStatus: 'draft'
      })

      toast.success('Listing saved successfully!')
      router.push(`/dashboard/ebay/listings/${listingId}`)
    } catch (error: any) {
      console.error('Error saving listing:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to save listing'
      toast.error(`Failed to save listing: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardPageContainer>
      <DashboardHeader
        title="New eBay Listing"
        subtitle={step === 1 ? 'Upload images to get started' : 'Add listing details'}
      >
        <Link href="/dashboard/ebay">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </DashboardHeader>
      <DashboardContent>
        {step === 1 ? (
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Upload Images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={handleFileInputClick}
                className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-cyan-500 transition-colors cursor-pointer"
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Drag and drop images here, or click to select</p>
                <p className="text-sm text-gray-500 mb-4">Maximum 10 images (JPEG, PNG, WebP)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="camera-upload"
                />
                <div className="flex gap-3 justify-center" onClick={(e) => e.stopPropagation()}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleFileInputClick}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Select Images
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCameraClick}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Use Camera
                  </Button>
                </div>
              </div>

              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Selected Images ({selectedFiles.length}/10)</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          onClick={() => removeFile(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={handleUploadAndGenerate}
                  disabled={loading || selectedFiles.length === 0}
                  className="min-w-[150px]"
                >
                  {loading ? (
                    <>
                      <Loader className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Generate Listing
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Listing Details</CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Listing Code: <span className="font-mono font-semibold">{listingCode}</span>
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter listing title"
                  required
                />
                {generatedTitle && (
                  <p className="text-xs text-gray-500 mt-1">
                    AI Generated: {generatedTitle}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="categoryId">Category</Label>
                  <Select
                    value={formData.categoryId || 'none'}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: value === 'none' ? '' : value }))}
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
                </div>

                <div>
                  <Label htmlFor="storageLocationId">Storage Location</Label>
                  <Select
                    value={formData.storageLocationId || 'none'}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, storageLocationId: value === 'none' ? '' : value }))}
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
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="condition">Condition</Label>
                  <Select
                    value={formData.conditionId || 'none'}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, conditionId: value === 'none' ? '' : value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {conditions.filter(c => c.isActive).map((condition) => (
                        <SelectItem key={condition.id} value={condition.id}>
                          {condition.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="testStatus">Test Status</Label>
                  <Select
                    value={formData.testStatus || 'none'}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, testStatus: value === 'none' ? '' : value }))}
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
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about this listing"
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-4">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={loading}
                >
                  Back
                </Button>
                <Button
                  onClick={handleSaveListing}
                  disabled={loading || !formData.title}
                  className="min-w-[150px]"
                >
                  {loading ? (
                    <>
                      <Loader className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Listing'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </DashboardContent>
    </DashboardPageContainer>
  )
}

