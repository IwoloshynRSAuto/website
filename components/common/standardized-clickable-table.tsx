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
import { cn } from '@/lib/utils'

export interface TableColumn<T> {
  key: string
  label: string
  sortable?: boolean
  className?: string
  render?: (value: any, item: T) => React.ReactNode
  align?: 'left' | 'right' | 'center'
}

interface StandardizedClickableTableProps<T> {
  data: T[]
  columns: TableColumn<T>[]
  isLoading?: boolean
  onRowClick: (item: T) => void
  onEdit?: (item: T) => void
  onDelete?: (item: T) => void
  currentPage?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  onSortChange?: (field: string) => void
  emptyMessage?: string
  showActions?: boolean
  hoverColor?: string
  className?: string
}

export function StandardizedClickableTable<T extends { id: string }>({
  data,
  columns,
  isLoading = false,
  onRowClick,
  onEdit,
  onDelete,
  currentPage,
  totalPages,
  onPageChange,
  sortBy,
  sortOrder,
  onSortChange,
  emptyMessage = 'No items found',
  showActions = true,
  hoverColor = 'hover:bg-gray-50',
  className
}: StandardizedClickableTableProps<T>) {
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
    <Card className={className}>
      <div className="overflow-x-auto max-h-[calc(100vh-350px)] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-white z-10">
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className={column.className}>
                  {column.sortable !== false && onSortChange ? (
                    <SortButton field={column.key}>{column.label}</SortButton>
                  ) : (
                    column.label
                  )}
                </TableHead>
              ))}
              {showActions && (onEdit || onDelete) && (
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length + (showActions && (onEdit || onDelete) ? 1 : 0)} className="text-center py-8 text-gray-500">
                  Loading...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (showActions && (onEdit || onDelete) ? 1 : 0)} className="text-center py-8 text-gray-500">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow 
                  key={item.id} 
                  className={cn("cursor-pointer transition-colors duration-150", hoverColor)}
                  onClick={() => onRowClick(item)}
                >
                  {columns.map((column) => (
                    <TableCell 
                      key={column.key} 
                      className={cn(
                        column.align === 'right' && 'text-right',
                        column.align === 'center' && 'text-center',
                        column.className
                      )}
                    >
                      {column.render ? column.render((item as any)[column.key], item) : (item as any)[column.key]}
                    </TableCell>
                  ))}
                  {showActions && (onEdit || onDelete) && (
                    <TableCell 
                      className="text-right" 
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-2">
                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(item)}
                            className="h-8 w-8 p-0"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(item)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination - Only show if more than 1 page */}
      {totalPages && totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage! - 1)}
              disabled={currentPage === 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage! + 1)}
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

