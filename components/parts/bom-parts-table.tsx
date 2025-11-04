'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2, ArrowUpDown, ArrowUp, ArrowDown, Plus } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'

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

interface BOMPartsTableProps {
  bomId: string
  parts: BOMPart[]
  onPartUpdated: () => void
}

const statusColors: Record<string, string> = {
  HOLD: 'bg-yellow-100 text-yellow-800',
  ORDER: 'bg-blue-100 text-blue-800',
  PLACED: 'bg-purple-100 text-purple-800',
  HERE: 'bg-green-100 text-green-800',
  STOCK: 'bg-gray-100 text-gray-800',
  CUSTOMER_SUPPLIED: 'bg-orange-100 text-orange-800',
}

export function BOMPartsTable({ bomId, parts, onPartUpdated }: BOMPartsTableProps) {
  const [editingPartId, setEditingPartId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [localValues, setLocalValues] = useState<Record<string, { purchasePrice?: string; markupPercent?: string }>>({})

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  const sortedParts = [...parts].sort((a, b) => {
    if (!sortBy) return 0

    let aVal: any
    let bVal: any

    switch (sortBy) {
      case 'partNumber':
        aVal = a.partNumber
        bVal = b.partNumber
        break
      case 'purchasePrice':
        aVal = a.purchasePrice
        bVal = b.purchasePrice
        break
      case 'markupPercent':
        aVal = a.markupPercent
        bVal = b.markupPercent
        break
      case 'customerPrice':
        aVal = a.customerPrice
        bVal = b.customerPrice
        break
      case 'quantity':
        aVal = a.quantity
        bVal = b.quantity
        break
      default:
        return 0
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  const handleFieldUpdate = async (partId: string, field: string, value: any) => {
    try {
      const response = await fetch(`/api/boms/${bomId}/parts/${partId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })

      if (response.ok) {
        toast.success('Part updated')
        onPartUpdated()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update part')
      }
    } catch (error) {
      console.error('Error updating part:', error)
      toast.error('An error occurred while updating the part')
    }
  }

  const handleDelete = async (partId: string) => {
    if (!confirm('Are you sure you want to remove this part from the BOM?')) {
      return
    }

    try {
      const response = await fetch(`/api/boms/${bomId}/parts/${partId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Part removed from BOM')
        onPartUpdated()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to remove part')
      }
    } catch (error) {
      console.error('Error deleting part:', error)
      toast.error('An error occurred while removing the part')
    }
  }

  const SortButton = ({ field, children }: { field: string; children: React.ReactNode }) => {
    const isActive = sortBy === field
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-auto p-0 font-semibold hover:bg-transparent"
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center space-x-1">
          <span>{children}</span>
          {isActive ? (
            sortOrder === 'asc' ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-50" />
          )}
        </div>
      </Button>
    )
  }

  return (
    <div className="w-full" style={{ width: '100%', maxWidth: '100%' }}>
      <div className="max-h-[calc(100vh-400px)] overflow-y-auto" style={{ width: '100%', overflowX: 'hidden' }}>
        <Table className="w-full table-fixed" style={{ width: '100%', tableLayout: 'fixed' }}>
            <TableHeader className="sticky top-0 bg-white z-10 border-b border-gray-200">
              <TableRow>
                <TableHead className="min-w-[70px] max-w-[70px] text-xs font-semibold text-gray-700 uppercase tracking-wide px-0.5">
                  <SortButton field="partNumber">Part #</SortButton>
                </TableHead>
                <TableHead className="min-w-[450px] max-w-[450px] text-xs font-semibold text-gray-700 uppercase tracking-wide">Description</TableHead>
                <TableHead className="min-w-[50px] max-w-[50px] text-xs font-semibold text-gray-700 uppercase tracking-wide text-center px-0.5">
                  <div className="flex justify-center">
                    <SortButton field="quantity">Qty</SortButton>
                  </div>
                </TableHead>
                <TableHead className="min-w-[80px] max-w-[80px] text-xs font-semibold text-gray-700 uppercase tracking-wide px-0.5">Manufacturer</TableHead>
                <TableHead className="min-w-[70px] max-w-[70px] text-xs font-semibold text-gray-700 uppercase tracking-wide px-0.5">Source</TableHead>
                <TableHead className="min-w-[60px] max-w-[60px] text-center text-xs font-semibold text-gray-700 uppercase tracking-wide px-0.5">
                  <div className="flex justify-center">
                    <SortButton field="purchasePrice">Purchase</SortButton>
                  </div>
                </TableHead>
                <TableHead className="min-w-[50px] max-w-[50px] text-center text-xs font-semibold text-gray-700 uppercase tracking-wide px-0.5">
                  <div className="flex justify-center">
                    <SortButton field="markupPercent">Markup %</SortButton>
                  </div>
                </TableHead>
                <TableHead className="min-w-[70px] max-w-[70px] text-right text-xs font-semibold text-gray-700 uppercase tracking-wide px-0 pr-0">
                  <div className="flex justify-end">
                    <SortButton field="customerPrice">Customer</SortButton>
                  </div>
                </TableHead>
                <TableHead className="min-w-[85px] max-w-[85px] text-center text-xs font-semibold text-gray-700 uppercase tracking-wide px-0">Est. Delivery</TableHead>
                <TableHead className="min-w-[60px] max-w-[60px] text-center text-xs font-semibold text-gray-700 uppercase tracking-wide px-0 pr-0">Status</TableHead>
                <TableHead className="min-w-[45px] max-w-[45px] text-center text-xs font-semibold text-gray-700 uppercase tracking-wide px-0 pl-0">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedParts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                    No parts in this BOM
                  </TableCell>
                </TableRow>
              ) : (
                sortedParts.map((part) => (
                  <TableRow key={part.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-xs truncate max-w-[70px] overflow-hidden text-ellipsis whitespace-nowrap px-0.5" title={part.partNumber}>{part.partNumber}</TableCell>
                    <TableCell className="text-xs text-gray-600 truncate max-w-[450px] overflow-hidden text-ellipsis whitespace-nowrap" title={part.description || ''}>
                      {part.description || '-'}
                    </TableCell>
                    <TableCell className="p-0.5 text-center px-0.5">
                      <div className="flex justify-center">
                        <Input
                          type="number"
                          min="1"
                          value={part.quantity}
                          onChange={(e) => {
                            const qty = parseInt(e.target.value, 10)
                            if (!isNaN(qty) && qty > 0) {
                              handleFieldUpdate(part.id, 'quantity', qty)
                            }
                          }}
                          className="!h-6 !min-h-6 !text-xs !py-0 !px-1 text-center border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          style={{ 
                            WebkitAppearance: 'textfield',
                            MozAppearance: 'textfield',
                            textAlign: 'center',
                            height: '24px',
                            minHeight: '24px',
                            paddingTop: '0',
                            paddingBottom: '0',
                            paddingLeft: '4px',
                            paddingRight: '4px',
                            fontSize: '12px',
                            lineHeight: '24px',
                            width: '45px',
                            margin: '0 auto'
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-xs truncate max-w-[80px] overflow-hidden text-ellipsis whitespace-nowrap px-0.5" title={part.manufacturer}>{part.manufacturer}</TableCell>
                    <TableCell className="text-xs truncate max-w-[70px] overflow-hidden text-ellipsis whitespace-nowrap px-0.5" title={part.source || ''}>{part.source || '-'}</TableCell>
                    <TableCell className="text-center p-0.5 px-0.5">
                      <div className="flex justify-center">
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={localValues[part.id]?.purchasePrice !== undefined ? localValues[part.id].purchasePrice : part.purchasePrice.toFixed(2)}
                          onChange={(e) => {
                            const val = e.target.value
                            if (val === '' || /^\d*\.?\d*$/.test(val)) {
                              setLocalValues(prev => ({
                                ...prev,
                                [part.id]: { ...prev[part.id], purchasePrice: val }
                              }))
                            }
                          }}
                          onBlur={(e) => {
                            const val = e.target.value.trim()
                            if (val === '') {
                              handleFieldUpdate(part.id, 'purchasePrice', 0)
                              setLocalValues(prev => {
                                const updated = { ...prev }
                                delete updated[part.id]?.purchasePrice
                                if (Object.keys(updated[part.id] || {}).length === 0) {
                                  delete updated[part.id]
                                }
                                return updated
                              })
                            } else {
                              const num = parseFloat(val)
                              if (!isNaN(num) && num >= 0) {
                                handleFieldUpdate(part.id, 'purchasePrice', num)
                                setLocalValues(prev => {
                                  const updated = { ...prev }
                                  delete updated[part.id]?.purchasePrice
                                  if (Object.keys(updated[part.id] || {}).length === 0) {
                                    delete updated[part.id]
                                  }
                                  return updated
                                })
                              }
                            }
                          }}
                          className="!h-6 !min-h-6 !text-xs !py-0 !px-1 text-center border border-gray-300 rounded"
                          style={{
                            height: '24px',
                            minHeight: '24px',
                            paddingTop: '0',
                            paddingBottom: '0',
                            paddingLeft: '4px',
                            paddingRight: '4px',
                            fontSize: '12px',
                            lineHeight: '24px',
                            width: '60px',
                            textAlign: 'center'
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center p-0.5 px-0.5">
                      <div className="flex justify-center">
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={localValues[part.id]?.markupPercent !== undefined ? localValues[part.id].markupPercent : part.markupPercent.toString()}
                          onChange={(e) => {
                            const val = e.target.value
                            if (val === '' || /^\d*\.?\d*$/.test(val)) {
                              setLocalValues(prev => ({
                                ...prev,
                                [part.id]: { ...prev[part.id], markupPercent: val }
                              }))
                            }
                          }}
                          onBlur={(e) => {
                            const val = e.target.value.trim()
                            if (val === '') {
                              handleFieldUpdate(part.id, 'markupPercent', 0)
                              setLocalValues(prev => {
                                const updated = { ...prev }
                                delete updated[part.id]?.markupPercent
                                if (Object.keys(updated[part.id] || {}).length === 0) {
                                  delete updated[part.id]
                                }
                                return updated
                              })
                            } else {
                              const num = parseFloat(val)
                              if (!isNaN(num) && num >= 0) {
                                handleFieldUpdate(part.id, 'markupPercent', num)
                                setLocalValues(prev => {
                                  const updated = { ...prev }
                                  delete updated[part.id]?.markupPercent
                                  if (Object.keys(updated[part.id] || {}).length === 0) {
                                    delete updated[part.id]
                                  }
                                  return updated
                                })
                              }
                            }
                          }}
                          className="!h-6 !min-h-6 !text-xs !py-0 !px-1 text-center border border-gray-300 rounded"
                          style={{
                            height: '24px',
                            minHeight: '24px',
                            paddingTop: '0',
                            paddingBottom: '0',
                            paddingLeft: '4px',
                            paddingRight: '4px',
                            fontSize: '12px',
                            lineHeight: '24px',
                            width: '50px',
                            textAlign: 'center'
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600 text-xs max-w-[70px] px-0 pr-0">
                      ${part.customerPrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="p-0.5 px-0">
                      <div className="flex justify-center">
                        <Input
                          type="date"
                          value={part.estimatedDelivery ? part.estimatedDelivery.split('T')[0] : ''}
                          onChange={(e) => {
                            handleFieldUpdate(part.id, 'estimatedDelivery', e.target.value || null)
                          }}
                          className="!h-6 !min-h-6 !text-xs !py-0 !px-1 text-center border border-gray-300 rounded"
                          style={{ 
                            height: '24px',
                            minHeight: '24px',
                            paddingTop: '0',
                            paddingBottom: '0',
                            paddingLeft: '4px',
                            paddingRight: '4px',
                            fontSize: '12px',
                            lineHeight: '24px',
                            width: '85px',
                            textAlign: 'center'
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="p-0.5 px-0 pr-0">
                      <div className="flex justify-center">
                        <Select
                          value={part.status}
                          onValueChange={(value: any) => handleFieldUpdate(part.id, 'status', value)}
                        >
                          <SelectTrigger className="!h-6 !min-h-6 !text-xs !py-0 !px-1 text-center" style={{ height: '24px', minHeight: '24px', paddingTop: '0', paddingBottom: '0', paddingLeft: '4px', paddingRight: '4px', fontSize: '12px', lineHeight: '24px', width: '100%', textAlign: 'center', maxWidth: '60px' }}>
                            <SelectValue />
                          </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HOLD">Hold</SelectItem>
                          <SelectItem value="ORDER">Order</SelectItem>
                          <SelectItem value="PLACED">Placed</SelectItem>
                          <SelectItem value="HERE">Here</SelectItem>
                          <SelectItem value="STOCK">Stock</SelectItem>
                          <SelectItem value="CUSTOMER_SUPPLIED">Customer Supplied</SelectItem>
                        </SelectContent>
                      </Select>
                      </div>
                    </TableCell>
                    <TableCell className="text-center p-0 px-0 pl-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(part.id)}
                        className="h-3.5 w-3.5 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        title="Remove"
                      >
                        <Trash2 className="h-2 w-2" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
    </div>
  )
}

