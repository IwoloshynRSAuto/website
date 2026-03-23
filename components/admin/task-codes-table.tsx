'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Search, Code, Plus, Pencil, Trash2 } from 'lucide-react'
import { TaskCodeForm } from './task-code-form'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

interface TaskCode {
  id?: string
  code: string
  description: string
  category: 'PM' | 'SV' | 'AD'
  isActive?: boolean
}

interface TaskCodesTableProps {
  initialTaskCodes?: Array<{
    code: string
    description: string
    category: 'PM' | 'SV' | 'AD'
  }>
}

export function TaskCodesTable({ initialTaskCodes = [] }: TaskCodesTableProps) {
  const [taskCodes, setTaskCodes] = useState<TaskCode[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTaskCode, setEditingTaskCode] = useState<TaskCode | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadTaskCodes()
  }, [])
  
  // Auto-import on mount if database is empty but we have static codes
  useEffect(() => {
    if (!isLoading && taskCodes.length === 0 && initialTaskCodes.length > 0) {
      // Auto-import task codes from static file
      importTaskCodes()
    }
  }, [isLoading, taskCodes.length, initialTaskCodes.length])
  
  const importTaskCodes = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/task-codes/import', {
        method: 'POST',
      })
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: 'Success',
          description: `Imported ${data.data.created} task codes. ${data.data.updated > 0 ? `${data.data.updated} updated.` : ''}`,
        })
        loadTaskCodes()
      } else {
        throw new Error(data.error || 'Failed to import task codes')
      }
    } catch (error: any) {
      console.error('Error importing task codes:', error)
      // If import fails, show static codes as fallback
      const staticCodes: TaskCode[] = initialTaskCodes.map(tc => ({
        ...tc,
        isActive: true,
      }))
      setTaskCodes(staticCodes)
    } finally {
      setIsLoading(false)
    }
  }

  const loadTaskCodes = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/task-codes')
      const data = await response.json()
      
      if (data.success) {
        const codes = data.data || []
        if (codes.length > 0) {
          setTaskCodes(codes)
        } else if (initialTaskCodes.length > 0) {
          // If no codes in database, show static codes as fallback
          const staticCodes: TaskCode[] = initialTaskCodes.map(tc => ({
            id: tc.code, // Use code as temporary ID
            code: tc.code,
            description: tc.description,
            category: tc.category,
            isActive: true,
          }))
          setTaskCodes(staticCodes)
        } else {
          setTaskCodes([])
        }
      } else {
        // If API fails, use static codes as fallback
        if (initialTaskCodes.length > 0) {
          const staticCodes: TaskCode[] = initialTaskCodes.map(tc => ({
            id: tc.code,
            code: tc.code,
            description: tc.description,
            category: tc.category,
            isActive: true,
          }))
          setTaskCodes(staticCodes)
        } else {
          setTaskCodes([])
        }
      }
    } catch (error: any) {
      console.error('Error loading task codes:', error)
      // If API fails, use static codes as fallback
      if (initialTaskCodes.length > 0) {
        const staticCodes: TaskCode[] = initialTaskCodes.map(tc => ({
          id: tc.code,
          code: tc.code,
          description: tc.description,
          category: tc.category,
          isActive: true,
        }))
        setTaskCodes(staticCodes)
      } else {
        setTaskCodes([])
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string | undefined) => {
    if (!id) {
      toast({
        title: 'Error',
        description: 'Cannot delete task code from static file. Import to database first.',
        variant: 'destructive',
      })
      return
    }
    
    if (!confirm('Are you sure you want to delete this task code?')) {
      return
    }

    try {
      const response = await fetch(`/api/task-codes/${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Task code deleted successfully',
        })
        loadTaskCodes()
      } else {
        throw new Error(data.error || 'Failed to delete task code')
      }
    } catch (error: any) {
      console.error('Error deleting task code:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete task code',
        variant: 'destructive',
      })
    }
  }

  const handleEdit = (taskCode: TaskCode) => {
    setEditingTaskCode(taskCode)
    setIsFormOpen(true)
  }

  const handleAdd = () => {
    setEditingTaskCode(null)
    setIsFormOpen(true)
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setEditingTaskCode(null)
  }

  const categories = useMemo(() => {
    return Array.from(new Set(taskCodes.map(code => code.category))).sort()
  }, [taskCodes])

  const filteredTaskCodes = useMemo(() => {
    return taskCodes.filter(code => {
      const matchesSearch = code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           code.description.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesCategory = categoryFilter === 'ALL' || code.category === categoryFilter
      
      return matchesSearch && matchesCategory
    })
  }, [taskCodes, searchTerm, categoryFilter])

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'PM':
        return 'bg-blue-100 text-blue-800'
      case 'SV':
        return 'bg-green-100 text-green-800'
      case 'AD':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Task Codes</CardTitle>
            <Button onClick={handleAdd} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Task Code
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by code or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category === 'PM' ? 'Project Management' : category === 'SV' ? 'Service' : 'Administrative'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {filteredTaskCodes.length} of {taskCodes.length} task codes
            </div>
            {taskCodes.length > 0 && (
              <div className="text-xs text-gray-500">
                💡 Click any row to select it for task creation
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading task codes...</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[150px]">Category</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[150px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTaskCodes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No task codes found matching your search
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTaskCodes.map((code) => (
                      <TableRow 
                        key={code.id || code.code}
                        className="cursor-pointer hover:bg-blue-50 transition-colors"
                        onClick={() => {
                          // Store task code in localStorage for task creation
                          localStorage.setItem('selectedTaskCode', JSON.stringify({
                            code: code.code,
                            description: code.description,
                          }))
                          toast({
                            title: 'Task code selected',
                            description: `"${code.code}" will be pre-selected when creating a new task`,
                          })
                        }}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Code className="h-4 w-4 text-blue-500" />
                            <span className="font-mono">{code.code}</span>
                          </div>
                        </TableCell>
                        <TableCell>{code.description}</TableCell>
                        <TableCell>
                          <Badge className={cn("font-medium", getCategoryColor(code.category))}>
                            {code.category === 'PM' ? 'Project Management' : 
                             code.category === 'SV' ? 'Service' : 'Administrative'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={code.isActive ? "default" : "secondary"}>
                            {code.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                // Store task code in localStorage for task creation
                                localStorage.setItem('selectedTaskCode', JSON.stringify({
                                  code: code.code,
                                  description: code.description,
                                }))
                                toast({
                                  title: 'Task code selected',
                                  description: `"${code.code}" will be pre-selected when creating a new task`,
                                })
                              }}
                              title="Select this code for task creation"
                            >
                              <Plus className="h-4 w-4 text-blue-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEdit(code)
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {code.id && code.id !== code.code && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDelete(code.id)
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <TaskCodeForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        onSave={loadTaskCodes}
        taskCode={editingTaskCode}
      />
    </>
  )
}
