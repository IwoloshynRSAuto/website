'use client'

import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { Edit, Trash2, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { format } from 'date-fns'

interface Part {
  id: string
  partNumber: string
  manufacturer: string
  description: string | null
  category: string | null
  subcategory: string | null
  primarySource: string | null
  purchasePrice: number | null
  secondarySources: string[] | undefined
  createdAt?: string
  updatedAt?: string
  relatedParts?: Array<{
    id: string
    partNumber: string
    manufacturer: string
    description: string | null
  }>
}

interface PartsTableProps {
  parts: Part[]
  isLoading: boolean
  onView: (part: Part) => void
  onEdit: (part: Part) => void
  onDelete: (part: Part) => void
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  onSortChange?: (field: string) => void
}

export function PartsTable({
  parts,
  isLoading,
  onView,
  onEdit,
  onDelete,
  currentPage,
  totalPages,
  onPageChange,
  sortBy,
  sortOrder,
  onSortChange
}: PartsTableProps) {
  const handleSort = (field: string) => {
    if (onSortChange) {
      onSortChange(field)
    }
  }

  const SortButton = ({ field, children }: { field: string, children: React.ReactNode }) => {
    if (!onSortChange) return <>{children}</>
    
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
    <Card>
      <div className="overflow-x-auto max-h-[calc(100vh-350px)] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-white z-10">
            <TableRow>
              <TableHead className="w-[150px]">
                <SortButton field="partNumber">Part Number</SortButton>
              </TableHead>
              <TableHead className="min-w-[200px]">Description</TableHead>
              <TableHead className="w-[150px]">
                <SortButton field="category">Category</SortButton>
              </TableHead>
              <TableHead className="w-[150px]">
                <SortButton field="manufacturer">Manufacturer</SortButton>
              </TableHead>
              <TableHead className="w-[150px]">
                <SortButton field="primarySource">Primary Vendor</SortButton>
              </TableHead>
              <TableHead className="w-[120px] text-right">
                <div className="flex justify-end">
                  <SortButton field="purchasePrice">Purchase Price</SortButton>
                </div>
              </TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  Loading...
                </TableCell>
              </TableRow>
            ) : parts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No parts found
                </TableCell>
              </TableRow>
            ) : (
              parts.map((part) => (
                <TableRow 
                  key={part.id} 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => onView(part)}
                >
                  <TableCell className="font-medium">{part.partNumber}</TableCell>
                  <TableCell className="max-w-[300px]">
                    <div className="truncate" title={part.description || ''}>
                      {part.description || <span className="text-gray-400">No description</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {part.category ? (
                      <div>
                        <div className="font-medium">{part.category}</div>
                        {part.subcategory && (
                          <div className="text-xs text-gray-500">{part.subcategory}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>{part.manufacturer}</TableCell>
                  <TableCell>{part.primarySource || <span className="text-gray-400">-</span>}</TableCell>
                  <TableCell className="text-right">
                    {part.purchasePrice !== null ? (
                      <span className="font-medium">${part.purchasePrice.toFixed(2)}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(part)}
                        className="h-8 w-8 p-0"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(part)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination - Only show if more than 1 page */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages || isLoading}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

