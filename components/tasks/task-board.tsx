'use client'

import React from 'react'

import { useState, useEffect, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Trash2, Edit2, User, FileText, Wrench, Link as LinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { DashboardPageContainer, DashboardHeader, DashboardContent } from '@/components/layout/dashboard-page'
import { useSession } from 'next-auth/react'

interface Task {
  id: string
  title: string
  description: string | null
  status: 'TO_DO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'
  assignedTo: string | null
  createdAt: string
  updatedAt: string
  quote: {
    id: string
    quoteNumber: string
    title: string
  } | null
  job: {
    id: string
    jobNumber: string
    title: string
    type: string
  } | null
}

interface User {
  id: string
  name: string | null
  email: string
}

interface TaskBoardProps {
  userId: string
  users?: User[]
  isAdmin?: boolean
}

const STATUS_COLUMNS: Array<{
  id: 'TO_DO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'
  label: string
  color: string
}> = [
  { id: 'TO_DO', label: 'To Do', color: 'bg-gray-100 border-gray-300' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-100 border-blue-300' },
  { id: 'REVIEW', label: 'Review', color: 'bg-yellow-100 border-yellow-300' },
  { id: 'DONE', label: 'Done', color: 'bg-green-100 border-green-300' },
]

function TaskCard({ task, isDragging, onEdit, onDelete }: { task: Task; isDragging?: boolean; onEdit: (task: Task) => void; onDelete: (taskId: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id })
  const router = useRouter()

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  }

  const handleJobQuoteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (task.quote) {
      router.push(`/dashboard/parts/quotes/${task.quote.id}`)
    } else if (task.job) {
      router.push(`/dashboard/jobs/${task.job.id}`)
    }
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="mb-3 p-4 bg-white rounded-lg shadow-sm border border-gray-200 relative hover:shadow-md transition-all duration-150"
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-gray-800">{task.title}</h4>
        <Badge variant="secondary" className="text-xs">
          {task.status.replace('_', ' ')}
        </Badge>
      </div>
      {task.description && (
        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
      )}
      {(task.quote || task.job) && (
        <div className="mb-2">
          {task.quote && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50"
              onClick={handleJobQuoteClick}
            >
              <FileText className="h-3 w-3 mr-1" />
              {task.quote.quoteNumber}
            </Button>
          )}
          {task.job && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-green-600 hover:text-green-800 hover:bg-green-50"
              onClick={handleJobQuoteClick}
            >
              <Wrench className="h-3 w-3 mr-1" />
              {task.job.jobNumber}
            </Button>
          )}
        </div>
      )}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>Created: {format(new Date(task.createdAt), 'MMM d, yyyy')}</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); onEdit(task) }}>
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500 hover:text-red-700" onClick={(e) => { e.stopPropagation(); onDelete(task.id) }}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </Card>
  )
}

function StatusColumn({ id, label, color, tasks, onEditTask, onDeleteTask }: {
  id: 'TO_DO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'
  label: string
  color: string
  tasks: Task[]
  onEditTask: (task: Task) => void
  onDeleteTask: (taskId: string) => void
}) {
  const { setNodeRef } = useDroppable({ id })

  return (
    <Card className={`border-2 ${color} shadow-md`}>
      <CardHeader className="pb-3 bg-white/50 border-b border-gray-200">
        <CardTitle className="flex items-center justify-between text-sm font-semibold text-gray-700">
          <div className="flex items-center gap-2">
            {label}
            <Badge variant="secondary">{tasks.length}</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent ref={setNodeRef} className="p-4 min-h-[150px] max-h-[calc(100vh-300px)] overflow-y-auto">
        <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No tasks in this column</div>
          ) : (
            tasks.map((task) => (
              <TaskCard key={task.id} task={task} onEdit={onEditTask} onDelete={onDeleteTask} />
            ))
          )}
        </SortableContext>
      </CardContent>
    </Card>
  )
}

export function TaskBoard({ userId: initialUserId, users = [], isAdmin = false }: TaskBoardProps) {
  const { toast } = useToast()
  const router = useRouter()
  const { data: session } = useSession()
  const [selectedUserId, setSelectedUserId] = useState<string>(initialUserId)
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    loadTasks()
  }, [selectedUserId])

  const loadTasks = async () => {
    try {
      setIsLoading(true)
      // If admin and selected different user, fetch their tasks, otherwise fetch my tasks
      const url = isAdmin && selectedUserId !== initialUserId 
        ? `/api/tasks/my-tasks?userId=${selectedUserId}`
        : '/api/tasks/my-tasks'
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to load tasks')
      }
      
      const data = await response.json()
      if (data.success) {
        setTasks(data.data || [])
      }
    } catch (error) {
      console.error('Error loading tasks:', error)
      toast({
        title: 'Error',
        description: 'Failed to load tasks',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, Task[]> = {
      TO_DO: [],
      IN_PROGRESS: [],
      REVIEW: [],
      DONE: [],
    }
    tasks.forEach(task => {
      if (grouped[task.status]) {
        grouped[task.status].push(task)
      }
    })
    return grouped
  }, [tasks])

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id)
    setDraggedTask(task || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setDraggedTask(null)

    if (!over || active.id === over.id) return

    const taskId = active.id as string
    const newStatus = over.id as string

    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: newStatus as Task['status'] } : t
    ))

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) throw new Error('Failed to update task')

      const data = await response.json()
      if (data.success) {
        await loadTasks()
      }
    } catch (error) {
      console.error('Error updating task:', error)
      toast({
        title: 'Error',
        description: 'Failed to update task status',
        variant: 'destructive',
      })
      await loadTasks()
    }
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setFormData({
      title: task.title,
      description: task.description || '',
    })
    setIsEditDialogOpen(true)
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete task')
      }

      toast({
        title: 'Success',
        description: 'Task deleted successfully',
      })
      await loadTasks()
    } catch (error: any) {
      console.error('Error deleting task:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete task',
        variant: 'destructive',
      })
    }
  }

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim()) {
      toast({
        title: 'Error',
        description: 'Title is required',
        variant: 'destructive',
      })
      return
    }

    if (!editingTask) return

    try {
      const response = await fetch(`/api/tasks/${editingTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
        }),
      })

      const data = await response.json()
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update task')
      }

      toast({
        title: 'Success',
        description: 'Task updated successfully',
      })
      
      setIsEditDialogOpen(false)
      setEditingTask(null)
      setFormData({ title: '', description: '' })
      await loadTasks()
    } catch (error: any) {
      console.error('Error updating task:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to update task',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return (
      <DashboardPageContainer>
        <DashboardHeader title="Task Board" subtitle="All your assigned tasks" />
        <DashboardContent>
          <div className="text-center py-8 text-gray-500">Loading tasks...</div>
        </DashboardContent>
      </DashboardPageContainer>
    )
  }

  const selectedUserName = users.find(u => u.id === selectedUserId)?.name || 
                          (selectedUserId === initialUserId ? session?.user?.name : 'Unknown User')

  return (
    <DashboardPageContainer>
      <DashboardHeader 
        title="Task Board" 
        subtitle={`Viewing tasks assigned to ${selectedUserName} (${tasks.length} total)`}
      />
      <DashboardContent>
        {/* Employee Filter */}
        {isAdmin && users.length > 0 && (
          <div className="mb-6 flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-gray-500" />
              <Label htmlFor="employee-select">Employee:</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select Employee" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email} {user.id === initialUserId ? '(You)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <div className="w-full space-y-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {STATUS_COLUMNS.map((column) => {
                const columnTasks = tasksByStatus[column.id] || []

                return (
                  <StatusColumn
                    key={column.id}
                    id={column.id}
                    label={column.label}
                    color={column.color}
                    tasks={columnTasks}
                    onEditTask={handleEditTask}
                    onDeleteTask={handleDeleteTask}
                  />
                )
              })}
            </div>

            <DragOverlay>
              {draggedTask ? <TaskCard task={draggedTask} isDragging onEdit={() => {}} onDelete={() => {}} /> : null}
            </DragOverlay>
          </DndContext>

          {/* Edit Task Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Task</DialogTitle>
                <DialogDescription>Update task details</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitTask}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-title">Title *</Label>
                    <Input
                      id="edit-title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea
                      id="edit-description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter className="mt-4">
                  <Button type="button" variant="outline" onClick={() => {
                    setIsEditDialogOpen(false)
                    setEditingTask(null)
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit">Update Task</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardContent>
    </DashboardPageContainer>
  )
}

