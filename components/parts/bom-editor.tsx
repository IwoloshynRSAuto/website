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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Save, Copy, Download, Plus, FileText, Settings, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { BOMPartsTable } from './bom-parts-table'

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
  category: string | null
  subcategory: string | null
  source: string | null
  notes: string | null
  estimatedDelivery: string | null
  status: 'HOLD' | 'ORDER' | 'PLACED' | 'HERE' | 'STOCK' | 'CUSTOMER_SUPPLIED'
  originalPart?: {
    id: string
    partNumber: string
    manufacturer: string
    description: string | null
    category: string | null
    subcategory: string | null
  }
}

interface BOM {
  id: string
  name: string
  status: 'DRAFT' | 'QUOTE' | 'ASSEMBLY'
  notes?: string | null
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
  const [bomStatus, setBOMStatus] = useState<'DRAFT' | 'QUOTE' | 'ASSEMBLY'>(initialBOM.status || 'DRAFT')
  const [bomNotes, setBOMNotes] = useState(initialBOM.notes || '')
  const [isSaving, setIsSaving] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [parts, setParts] = useState<BOMPart[]>(initialBOM.parts)

  useEffect(() => {
    setParts(bom.parts.map(part => ({
      ...part,
      category: part.originalPart?.category || null,
      subcategory: part.originalPart?.subcategory || null,
    })))
  }, [bom])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Update BOM
      const response = await fetch(`/api/boms/${bom.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: bomName,
          status: bomStatus,
          notes: bomNotes || null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update BOM')
      }

      const updated = await response.json()
      toast.success('BOM saved successfully')
      setBOM({ ...bom, name: bomName, status: updated.status, notes: updated.notes })
    } catch (error) {
      console.error('Error saving BOM:', error)
      toast.error('Failed to save BOM')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveAsQuote = async () => {
    setIsConverting(true)
    try {
      // Create quote from BOM
      const quoteResponse = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bomId: bom.id }),
      })

      if (!quoteResponse.ok) {
        throw new Error('Failed to create quote')
      }

      const quote = await quoteResponse.json()
      toast.success('BOM saved as Quote successfully')
      
      // Update local status
      setBOMStatus('QUOTE')
      setBOM({ ...bom, status: 'QUOTE' })
      
      // Optionally navigate to quote
      router.push(`/dashboard/parts/quotes/${quote.id}`)
    } catch (error) {
      console.error('Error saving as quote:', error)
      toast.error('Failed to save as quote')
    } finally {
      setIsConverting(false)
    }
  }

  const handleConvertToAssembly = async () => {
    setIsConverting(true)
    try {
      // Update BOM status to ASSEMBLY
      const response = await fetch(`/api/boms/${bom.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ASSEMBLY' }),
      })

      if (!response.ok) {
        throw new Error('Failed to convert to assembly')
      }

      toast.success('BOM converted to Assembly successfully')
      setBOMStatus('ASSEMBLY')
      setBOM({ ...bom, status: 'ASSEMBLY' })
    } catch (error) {
      console.error('Error converting to assembly:', error)
      toast.error('Failed to convert to assembly')
    } finally {
      setIsConverting(false)
    }
  }

  const handleDuplicate = async () => {
    try {
      const response = await fetch('/api/boms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${bom.name} (Copy)`,
          partIds: bom.parts.filter(p => p.partId).map(p => p.partId!).filter(Boolean),
        }),
      })

      if (response.ok) {
        const newBOM = await response.json()
        toast.success('BOM duplicated successfully')
        router.push(`/dashboard/parts/assemblies/${newBOM.id}`)
      } else {
        throw new Error('Failed to duplicate BOM')
      }
    } catch (error) {
      console.error('Error duplicating BOM:', error)
      toast.error('Failed to duplicate BOM')
    }
  }

  const handleExport = () => {
    // Simple CSV export
    const csvRows = [
      ['Part #', 'Description', 'Category', 'Subcategory', 'Quantity', 'Manufacturer', 'Source', 'Purchase Price', 'Markup %', 'Customer Price', 'Status', 'Notes'].join(','),
      ...parts.map(part => [
        part.partNumber,
        `"${part.description || ''}"`,
        part.category || '',
        part.subcategory || '',
        part.quantity,
        part.manufacturer,
        part.source || '',
        part.purchasePrice.toFixed(2),
        part.markupPercent.toFixed(1),
        part.customerPrice.toFixed(2),
        part.status,
        `"${part.notes || ''}"`,
      ].join(','))
    ]

    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${bom.name.replace(/[^a-z0-9]/gi, '_')}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    toast.success('BOM exported to CSV')
  }

  const handlePartUpdated = () => {
    // Refetch BOM to get updated parts
    fetch(`/api/boms/${bom.id}`)
      .then(r => r.json())
      .then(data => {
        setBOM(data)
        setParts(data.parts.map((part: any) => ({
          ...part,
          category: part.originalPart?.category || null,
          subcategory: part.originalPart?.subcategory || null,
        })))
      })
      .catch(err => console.error('Error refreshing BOM:', err))
  }

  const handleAddPart = () => {
    router.push(`/dashboard/parts/assemblies/${bom.id}/add-part`)
  }

  const totalCost = parts.reduce((sum, part) => sum + (part.purchasePrice * part.quantity), 0)
  const totalCustomerPrice = parts.reduce((sum, part) => sum + part.customerPrice, 0) // customerPrice already includes quantity

  return (
    <DashboardPageContainer>
      <DashboardHeader
        title={bomName}
        subtitle={`Created ${format(new Date(bom.createdAt), 'MMM d, yyyy')}`}
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push('/dashboard/parts/assemblies')}>
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
          {bomStatus === 'DRAFT' && (
            <>
              <Button 
                variant="outline" 
                onClick={handleSaveAsQuote}
                disabled={isConverting}
                className="border-green-600 text-green-700 hover:bg-green-50"
              >
                <FileText className="h-4 w-4 mr-2" />
                Save as Quote
              </Button>
              <Button 
                variant="outline" 
                onClick={handleConvertToAssembly}
                disabled={isConverting}
                className="border-purple-600 text-purple-700 hover:bg-purple-50"
              >
                <Settings className="h-4 w-4 mr-2" />
                Convert to Assembly
              </Button>
            </>
          )}
          <Button onClick={handleSave} disabled={isSaving || isConverting} className="bg-blue-600 hover:bg-blue-700 text-white">
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
            <Select value={bomStatus} onValueChange={(value: 'DRAFT' | 'QUOTE' | 'ASSEMBLY') => setBOMStatus(value)}>
              <SelectTrigger id="bom-status" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Draft</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="QUOTE">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-green-600 text-green-700">Quote</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="ASSEMBLY">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-purple-600 text-purple-700">Assembly</Badge>
                  </div>
                </SelectItem>
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
          <Button onClick={handleAddPart} className="bg-blue-600 hover:bg-blue-700 text-white">
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
  )
}

