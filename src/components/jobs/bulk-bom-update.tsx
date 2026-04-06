'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { CheckSquare, XSquare } from 'lucide-react'

interface BOMPart {
  id: string
  partNumber: string
  description: string | null
  status: string
  source: string | null
}

interface BulkBOMUpdateProps {
  bomId: string
  parts: BOMPart[]
  onUpdated: () => void
}

const statusOptions = [
  { value: 'HOLD', label: 'Hold', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'ORDER', label: 'Order', color: 'bg-blue-100 text-blue-800' },
  { value: 'PLACED', label: 'Placed', color: 'bg-purple-100 text-purple-800' },
  { value: 'HERE', label: 'Here', color: 'bg-green-100 text-green-800' },
  { value: 'STOCK', label: 'Stock', color: 'bg-gray-100 text-gray-800' },
  { value: 'CUSTOMER_SUPPLIED', label: 'Customer Supplied', color: 'bg-orange-100 text-orange-800' },
]

export function BulkBOMUpdate({ bomId, parts, onUpdated }: BulkBOMUpdateProps) {
  const { toast } = useToast()
  const [selectedParts, setSelectedParts] = useState<Set<string>>(new Set())
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterVendor, setFilterVendor] = useState<string>('all')
  const [newStatus, setNewStatus] = useState<string>('')
  const [isUpdating, setIsUpdating] = useState(false)

  const vendors = Array.from(new Set(parts.map(p => p.source).filter(Boolean))) as string[]

  const filteredParts = parts.filter(part => {
    const matchesStatus = filterStatus === 'all' || part.status === filterStatus
    const matchesVendor = filterVendor === 'all' || part.source === filterVendor
    return matchesStatus && matchesVendor
  })

  const handleSelectAll = () => {
    if (selectedParts.size === filteredParts.length) {
      setSelectedParts(new Set())
    } else {
      setSelectedParts(new Set(filteredParts.map(p => p.id)))
    }
  }

  const handleSelectPart = (partId: string) => {
    const newSelected = new Set(selectedParts)
    if (newSelected.has(partId)) {
      newSelected.delete(partId)
    } else {
      newSelected.add(partId)
    }
    setSelectedParts(newSelected)
  }

  const handleBulkUpdate = async () => {
    if (selectedParts.size === 0) {
      toast({
        title: 'No parts selected',
        description: 'Please select at least one part to update',
        variant: 'destructive',
      })
      return
    }

    if (!newStatus) {
      toast({
        title: 'No status selected',
        description: 'Please select a new status',
        variant: 'destructive',
      })
      return
    }

    setIsUpdating(true)

    try {
      const updates = Array.from(selectedParts).map(partId => ({
        partId,
        status: newStatus,
      }))

      // Update each part individually (could be optimized with a bulk endpoint)
      const promises = updates.map(update =>
        fetch(`/api/boms/${bomId}/parts/${update.partId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: update.status }),
        })
      )

      const results = await Promise.all(promises)
      const failed = results.filter(r => !r.ok)

      if (failed.length > 0) {
        throw new Error(`${failed.length} parts failed to update`)
      }

      toast({
        title: 'Success',
        description: `Updated ${selectedParts.size} part(s) to ${statusOptions.find(s => s.value === newStatus)?.label}`,
      })

      setSelectedParts(new Set())
      setNewStatus('')
      onUpdated()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update parts',
        variant: 'destructive',
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const option = statusOptions.find(s => s.value === status)
    return option ? (
      <Badge className={option.color}>{option.label}</Badge>
    ) : (
      <Badge>{status}</Badge>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Status Update</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Filter by Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statusOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Filter by Vendor</Label>
            <Select value={filterVendor} onValueChange={setFilterVendor}>
              <SelectTrigger>
                <SelectValue placeholder="All vendors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {vendors.map(vendor => (
                  <SelectItem key={vendor} value={vendor}>
                    {vendor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Select All */}
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedParts.size === filteredParts.length && filteredParts.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <Label>
              Select All ({filteredParts.length} parts)
            </Label>
          </div>
          <div className="text-sm text-gray-600">
            {selectedParts.size} selected
          </div>
        </div>

        {/* Parts List */}
        <div className="max-h-64 overflow-y-auto space-y-2">
          {filteredParts.length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              No parts match the filters
            </div>
          ) : (
            filteredParts.map(part => (
              <div
                key={part.id}
                className="flex items-center gap-3 p-2 border rounded hover:bg-gray-50"
              >
                <Checkbox
                  checked={selectedParts.has(part.id)}
                  onCheckedChange={() => handleSelectPart(part.id)}
                />
                <div className="flex-1">
                  <div className="font-medium">{part.partNumber}</div>
                  <div className="text-sm text-gray-500">{part.description || '—'}</div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(part.status)}
                  {part.source && (
                    <Badge variant="outline">{part.source}</Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Update Controls */}
        {selectedParts.size > 0 && (
          <div className="border-t pt-4 space-y-4">
            <div>
              <Label>New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleBulkUpdate}
              disabled={isUpdating || !newStatus}
              className="w-full"
            >
              {isUpdating ? 'Updating...' : `Update ${selectedParts.size} Part(s)`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

