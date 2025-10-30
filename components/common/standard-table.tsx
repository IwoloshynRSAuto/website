'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Edit, Trash2, Eye } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface StandardTableColumn {
  key: string
  label: string
  sortable?: boolean
  width?: string
  className?: string
  render?: (value: any, item: any) => React.ReactNode
}

interface StandardTableProps {
  title: string
  data: any[]
  columns: StandardTableColumn[]
  searchFields?: string[]
  onEdit?: (item: any) => void
  onDelete?: (item: any) => void
  onView?: (item: any) => void
  detailRoute?: string
  createButton?: React.ReactNode
  emptyMessage?: string
  className?: string
  showEditButton?: boolean
  showDeleteButton?: boolean
}

export function StandardTable({
  title,
  data,
  columns,
  searchFields = [],
  onEdit,
  onDelete,
  onView,
  detailRoute,
  createButton,
  emptyMessage = "No items found",
  className = "",
  showEditButton = true,
  showDeleteButton = true
}: StandardTableProps) {
  const router = useRouter()
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

  const handleRowClick = (item: any) => {
    if (onEdit) {
      onEdit(item)
    } else if (detailRoute) {
      router.push(`${detailRoute}/${item.id}`)
    } else if (onView) {
      onView(item)
    }
  }

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation()
    action()
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            {title}
          </CardTitle>
          <div className="flex items-center space-x-2">
            {createButton}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead 
                    key={column.key}
                    className={`py-1 px-1 text-xs ${column.width || ''} ${column.className || ''}`}
                  >
                    {column.sortable ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                        onClick={() => handleSort(column.key)}
                      >
                        <div className="flex items-center space-x-1">
                          <span>{column.label}</span>
                          {sortBy === column.key ? (
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
                    ) : (
                      column.label
                    )}
                  </TableHead>
                ))}
                {((showEditButton && onEdit) || (showDeleteButton && onDelete) || onView || detailRoute) && (
                  <TableHead className="py-1 px-1 text-xs w-16">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.length === 0 ? (
                <TableRow>
                  <TableCell 
                    colSpan={columns.length + (((showEditButton && onEdit) || (showDeleteButton && onDelete) || onView || detailRoute) ? 1 : 0)} 
                    className="text-center text-muted-foreground py-8"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                sortedData.map((item, index) => (
                  <TableRow 
                    key={item.id} 
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50/20 cursor-pointer transition-colors`}
                    onClick={() => handleRowClick(item)}
                  >
                    {columns.map((column) => (
                      <TableCell 
                        key={column.key} 
                        className={`py-1 px-1 text-xs ${column.className || ''}`}
                      >
                        {column.render ? column.render(item[column.key], item) : item[column.key]}
                      </TableCell>
                    ))}
                    {((showEditButton && onEdit) || (showDeleteButton && onDelete) || onView || detailRoute) && (
                      <TableCell className="py-1 px-1" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center space-x-1">
                          {onView && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => handleActionClick(e, () => onView(item))}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          )}
                          {showEditButton && onEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => handleActionClick(e, () => onEdit(item))}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          )}
                          {showDeleteButton && onDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                              onClick={(e) => handleActionClick(e, () => onDelete(item))}
                            >
                              <Trash2 className="h-3 w-3" />
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
      </CardContent>
    </Card>
  )
}
