'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardPageContainer, DashboardHeader, DashboardContent } from '@/components/layout/dashboard-page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { ArrowLeft, Save, Copy, Download, Plus, FileText, Settings, Tag as TagIcon, Package, Trash2 } from 'lucide-react'
import { BOMPartsTable } from '@/components/parts/bom-parts-table'
import { TagToQuoteDialog } from './tag-to-quote-dialog'

interface BOMPart {
  id: string
  bomId: string
  partId: string | null
  partNumber: string
  quantity: number
  purchasePrice: number
  markupPercent: number
  customerPrice: number
  manufacturer: string
  description: string | null
  source: string | null
  notes: string | null
  estimatedDelivery: string | null
  status: 'HOLD' | 'ORDER' | 'PLACED' | 'HERE' | 'STOCK' | 'CUSTOMER_SUPPLIED'
  originalPart?: {
    id: string
    partNumber: string
    manufacturer: string
    description: string | null
  }
}

interface BOM {
  id: string
  name: string
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
  notes?: string | null
  tags?: string[]
  createdAt: string
  updatedAt: string
  parts: BOMPart[]
}

interface BOMEditorProps {
  initialBOM: BOM
}

export function BOMEditor({ initialBOM }: BOMEditorProps) {
  const router = useRouter()
  const [bom, setBOM] = useState<BOM>(initialBOM)
  const [bomName, setBOMName] = useState(initialBOM.name)
  const [bomStatus, setBOMStatus] = useState<'DRAFT' | 'ACTIVE' | 'ARCHIVED'>(initialBOM.status || 'DRAFT')
  const [bomNotes, setBOMNotes] = useState(initialBOM.notes || '')
  const [tags, setTags] = useState<string[]>(initialBOM.tags || [])
  const [isSaving, setIsSaving] = useState(false)
  const [parts, setParts] = useState<BOMPart[]>(initialBOM.parts)
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false)

  useEffect(() => {
    setParts(bom.parts)
  }, [bom])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const tagsJSON = JSON.stringify(tags)
      
      const response = await fetch(`/api/boms/${bom.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: bomName,
          status: bomStatus,
          notes: bomNotes || null,
          tags: tagsJSON,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update BOM')
      }

      const updated = await response.json()
      let updatedTags: string[] = []
      try {
        if (updated.tags) {
          updatedTags = JSON.parse(updated.tags)
        }
      } catch (e) {}

      toast.success('BOM saved successfully')
      setBOM({ ...bom, name: bomName, status: updated.status, notes: updated.notes, tags: updatedTags })
    } catch (error) {
      console.error('Error saving BOM:', error)
      toast.error('Failed to save BOM')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDuplicate = async () => {
    if (!confirm('Are you sure you want to duplicate this BOM?')) return

    try {
      const response = await fetch('/api/boms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `${bom.name} (Copy)` }),
      })

      if (response.ok) {
        const newBOM = await response.json()
        // Add parts to the new BOM
        for (const part of parts) {
          await fetch(`/api/boms/${newBOM.id}/parts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              partId: part.partId,
              partNumber: part.partNumber,
              quantity: part.quantity,
              purchasePrice: part.purchasePrice,
              markupPercent: part.markupPercent,
              manufacturer: part.manufacturer,
              description: part.description,
              source: part.source,
              notes: part.notes,
              estimatedDelivery: part.estimatedDelivery,
              status: part.status,
            }),
          })
        }
        toast.success('BOM duplicated successfully')
        router.push(`/dashboard/parts/boms/${newBOM.id}`)
      } else {
        throw new Error('Failed to duplicate BOM')
      }
    } catch (error) {
      console.error('Error duplicating BOM:', error)
      toast.error('Failed to duplicate BOM.')
    }
  }

  const handleExport = () => {
    const headers = [
      'Part #', 'Description', 'Quantity', 'Manufacturer', 'Source',
      'Purchase Price', 'Markup %', 'Customer Price', 'Estimated Delivery', 'Status', 'Notes'
    ]
    const csvRows = [
      headers.join(','),
      ...parts.map(part => [
        part.partNumber,
        `"${part.description || ''}"`,
        part.quantity,
        part.manufacturer,
        part.source || '',
        part.purchasePrice.toFixed(2),
        part.markupPercent.toFixed(1),
        part.customerPrice.toFixed(2),
        part.estimatedDelivery ? format(new Date(part.estimatedDelivery), 'yyyy-MM-dd') : '',
        part.status,
        `"${part.notes || ''}"`,
      ].join(','))
    ]
    const csvString = csvRows.join('\n')
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', `${bom.name.replace(/\s/g, '_')}_BOM.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('BOM exported to CSV.')
  }

  const handleAddPart = () => {
    router.push(`/dashboard/parts/boms/${bom.id}/add-part`)
  }

  const handlePartUpdated = () => {
    // Refresh BOM parts
    fetch(`/api/boms/${bom.id}/parts`)
      .then(r => r.json())
      .then(data => {
        setParts(data.parts || [])
      })
      .catch(err => {
        console.error('Error refreshing parts:', err)
      })
  }

  const handleTagToQuote = async (quoteId: string) => {
    try {
      // Update the BOM's linkedQuoteId
      const bomResponse = await fetch(`/api/boms/${bom.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkedQuoteId: quoteId }),
      })

      if (!bomResponse.ok) {
        throw new Error('Failed to update BOM')
      }

      // Also link the quote to the BOM via the relation
      const quoteResponse = await fetch(`/api/quotes/${quoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bomId: bom.id }),
      })

      if (!quoteResponse.ok) {
        // If quote update fails, still consider it successful since BOM is updated
        console.warn('Failed to update quote relation, but BOM is linked')
      }

      toast.success('BOM linked to quote successfully')
      setIsTagDialogOpen(false)
      
      // Refresh BOM data
      const bomDataResponse = await fetch(`/api/boms/${bom.id}`)
      if (bomDataResponse.ok) {
        const bomData = await bomDataResponse.json()
        setBOM({ ...bom })
      }
    } catch (error) {
      console.error('Error linking to quote:', error)
      toast.error('Failed to link BOM to quote')
    }
  }

  const handleConvertToAssembly = async () => {
    if (!confirm('Are you sure you want to convert this BOM to an Assembly? This will create a new Package/Assembly.')) {
      return
    }

    try {
      // Create a new Package with type "Assembly"
      const packageResponse = await fetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${bom.name} (Assembly)`,
          type: 'Assembly',
          description: `Converted from BOM: ${bom.name}`,
          partIds: parts.filter(p => p.partId).map(p => p.partId),
          partQuantities: parts.reduce((acc, p) => {
            if (p.partId) {
              acc[p.partId] = p.quantity
            }
            return acc
          }, {} as Record<string, number>),
        }),
      })

      if (!packageResponse.ok) {
        throw new Error('Failed to create assembly')
      }

      const newPackage = await packageResponse.json()
      toast.success('BOM converted to Assembly successfully')
      router.push(`/dashboard/parts/packages/${newPackage.id}`)
    } catch (error) {
      console.error('Error converting to assembly:', error)
      toast.error('Failed to convert BOM to Assembly')
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${bom.name}"? This action cannot be undone and will delete all BOM parts.`)) {
      return
    }

    try {
      const response = await fetch(`/api/boms/${bom.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('BOM deleted successfully')
        router.push('/dashboard/parts/boms')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete BOM')
      }
    } catch (error) {
      console.error('Error deleting BOM:', error)
      toast.error('An error occurred while deleting the BOM')
    }
  }

  const totalCost = parts.reduce((sum, part) => sum + (part.purchasePrice * part.quantity), 0)
  const totalCustomerPrice = parts.reduce((sum, part) => sum + part.customerPrice, 0)

  return (
    <>
      <DashboardPageContainer>
        <DashboardHeader
          title={bomName}
          subtitle={`Created ${format(new Date(bom.createdAt), 'MMM d, yyyy')}`}
        >
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push('/dashboard/parts/boms')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button variant="outline" onClick={handleDuplicate}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setIsTagDialogOpen(true)}
              className="border-green-600 text-green-700 hover:bg-green-50"
            >
              <TagIcon className="h-4 w-4 mr-2" />
              Tag to Quote
            </Button>
            <Button 
              variant="outline" 
              onClick={handleConvertToAssembly}
              className="border-purple-600 text-purple-700 hover:bg-purple-50"
            >
              <Package className="h-4 w-4 mr-2" />
              Convert to Assembly
            </Button>
            <Button 
              variant="outline" 
              onClick={handleDelete}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl">
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DashboardHeader>

        <DashboardContent>
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bom-name">BOM Name</Label>
              <Input
                id="bom-name"
                value={bomName}
                onChange={(e) => setBOMName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="bom-status">Status</Label>
              <Select value={bomStatus} onValueChange={(value: 'DRAFT' | 'ACTIVE' | 'ARCHIVED') => setBOMStatus(value)}>
                <SelectTrigger id="bom-status" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mb-6">
            <Label htmlFor="bom-notes">Notes</Label>
            <Textarea
              id="bom-notes"
              value={bomNotes}
              onChange={(e) => setBOMNotes(e.target.value)}
              className="mt-1"
              rows={3}
              placeholder="Internal notes or comments..."
            />
          </div>


          <div className="mb-6">
            <Button onClick={handleAddPart} className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl">
              <Plus className="h-4 w-4 mr-2" />
              Add Part
            </Button>
          </div>

          <BOMPartsTable
            bomId={bom.id}
            parts={parts}
            onPartUpdated={handlePartUpdated}
          />

          {/* Summary Card */}
          <Card className="mt-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Parts</p>
                  <p className="text-2xl font-bold text-gray-900">{parts.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Cost</p>
                  <p className="text-2xl font-bold text-gray-900">${totalCost.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Customer Price</p>
                  <p className="text-2xl font-bold text-green-600">${totalCustomerPrice.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </DashboardContent>
      </DashboardPageContainer>

      <TagToQuoteDialog
        isOpen={isTagDialogOpen}
        onClose={() => setIsTagDialogOpen(false)}
        onTag={handleTagToQuote}
        currentBOMId={bom.id}
      />
    </>
  )
}

