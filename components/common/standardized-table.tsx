'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { TABLES } from '@/lib/dashboard-styles'
import { cn } from '@/lib/utils'

interface StandardizedTableColumn {
  key: string
  label: string
  sortable?: boolean
  width?: string
  className?: string
  render?: (value: any, item: any) => React.ReactNode
  align?: 'left' | 'center' | 'right'
}

interface StandardizedTableProps {
  data: any[]
  columns: StandardizedTableColumn[]
  searchFields?: string[]
  onRowClick?: (item: any) => void
  emptyMessage?: string
  className?: string
  searchPlaceholder?: string
}

export function StandardizedTable({
  data,
  columns,
  searchFields = [],
  onRowClick,
  emptyMessage = "No items found",
  className = "",
  searchPlaceholder = "Search...",
}: StandardizedTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(key)
      setSortOrder('asc')
    }
  }

  const filteredData = data.filter(item => {
    if (!searchTerm) return true
    
    return searchFields.some(field => {
      const value = item[field]
      return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    })
  })

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortBy) return 0
    
    const aValue = a[sortBy]
    const bValue = b[sortBy]
    
    if (aValue === null || aValue === undefined) return 1
    if (bValue === null || bValue === undefined) return -1
    
    const comparison = aValue.toString().localeCompare(bValue.toString())
    return sortOrder === 'asc' ? comparison : -comparison
  })

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
    <div className={className}>
      {searchFields.length > 0 && (
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
        </div>
      )}
      <div className={TABLES.container}>
        <Table>
          <TableHeader className={TABLES.header}>
            <TableRow className={TABLES.headerRow}>
              {columns.map((column) => (
                <TableHead 
                  key={column.key}
                  className={cn(
                    TABLES.headerCell,
                    column.width && `min-w-[${column.width}]`,
                    column.align === 'right' && 'text-right',
                    column.align === 'center' && 'text-center',
                    column.className
                  )}
                >
                  {column.sortable ? (
                    <SortButton field={column.key}>{column.label}</SortButton>
                  ) : (
                    column.label
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={columns.length}
                  className="text-center text-gray-500 py-8"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((item, index) => (
                <TableRow 
                  key={item.id || index}
                  className={cn(
                    TABLES.bodyRow,
                    onRowClick && 'cursor-pointer',
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  )}
                  onClick={() => onRowClick && onRowClick(item)}
                >
                  {columns.map((column) => (
                    <TableCell 
                      key={column.key} 
                      className={cn(
                        TABLES.bodyCell,
                        column.align === 'right' && 'text-right',
                        column.align === 'center' && 'text-center',
                        column.className
                      )}
                    >
                      {column.render ? column.render(item[column.key], item) : item[column.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

