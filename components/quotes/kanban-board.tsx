'use client'

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
import { Plus, Trash2, Edit2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Task {
  id: string
  title: string
  description: string | null
  assignedTo: string | null
  status: 'TO_DO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'
  createdAt: string
  updatedAt: string
}

interface User {
  id: string
  name: string | null
  email: string
}

interface KanbanBoardProps {
  quoteId?: string
  jobId?: string
  users?: User[]
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

function TaskCard({ task, isDragging, onEdit, onDelete, users }: { 
  task: Task
  isDragging?: boolean
  onEdit: () => void
  onDelete: () => void
  users?: User[]
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  }

  const assignedUser = users?.find(u => u.id === task.assignedTo)

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`mb-3 cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-50' : ''}`}
    >
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <h4 className="font-semibold text-sm">{task.title}</h4>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit()
                }}
              >
                <Edit2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-red-600"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          {task.description && (
            <p className="text-xs text-gray-600 line-clamp-2">{task.description}</p>
          )}
          {assignedUser && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <User className="h-3 w-3" />
              <span>{assignedUser.name || assignedUser.email}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function StatusColumn({
  id,
  label,
  color,
  tasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
  users,
}: {
  id: 'TO_DO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'
  label: string
  color: string
  tasks: Task[]
  onAddTask: (status: string) => void
  onEditTask: (task: Task) => void
  onDeleteTask: (taskId: string) => void
  users?: User[]
}) {
  const { setNodeRef } = useDroppable({ id })

  return (
    <Card className={`${color} border-2`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold">{label}</CardTitle>
          <Badge variant="outline" className="bg-white">
            {tasks.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent ref={setNodeRef} className="min-h-[200px] max-h-[600px] overflow-y-auto">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={() => onEditTask(task)}
              onDelete={() => onDeleteTask(task.id)}
              users={users}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">No tasks</div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2"
          onClick={() => onAddTask(id)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </CardContent>
    </Card>
  )
}

export function KanbanBoard({ quoteId, jobId, users = [] }: KanbanBoardProps) {
  const { toast } = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<'TO_DO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'>('TO_DO')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    loadTasks()
  }, [quoteId, jobId])

  const loadTasks = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (quoteId) params.append('quote_id', quoteId)
      if (jobId) params.append('job_id', jobId)
      
      const response = await fetch(`/api/tasks?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to load tasks')
      
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
        await loadTasks() // Refresh to get updated data
      }
    } catch (error) {
      console.error('Error updating task:', error)
      toast({
        title: 'Error',
        description: 'Failed to update task status',
        variant: 'destructive',
      })
      await loadTasks() // Revert on error
    }
  }

  const handleAddTask = (status: 'TO_DO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE') => {
    setSelectedStatus(status)
    setFormData({ title: '', description: '', assignedTo: '' })
    setIsAddDialogOpen(true)
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setFormData({
      title: task.title,
      description: task.description || '',
      assignedTo: task.assignedTo || '',
    })
    setIsEditDialogOpen(true)
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete task')

      toast({
        title: 'Success',
        description: 'Task deleted successfully',
      })
      await loadTasks()
    } catch (error) {
      console.error('Error deleting task:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete task',
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

    try {
      const url = editingTask ? `/api/tasks/${editingTask.id}` : '/api/tasks'
      const method = editingTask ? 'PUT' : 'POST'
      
      const body: any = {
        title: formData.title,
        description: formData.description || null,
        assigned_to: formData.assignedTo || null,
      }
      
      if (!editingTask) {
        if (quoteId) body.quote_id = quoteId
        if (jobId) body.job_id = jobId
        body.status = selectedStatus
      } else {
        // For edit, keep current status unless we want to allow changing it
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save task')
      }

      toast({
        title: 'Success',
        description: editingTask ? 'Task updated successfully' : 'Task created successfully',
      })
      
      setIsAddDialogOpen(false)
      setIsEditDialogOpen(false)
      setEditingTask(null)
      setFormData({ title: '', description: '', assignedTo: '' })
      await loadTasks()
    } catch (error: any) {
      console.error('Error saving task:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to save task',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Loading tasks...</div>
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="text-sm text-gray-500">
          Drag tasks between columns or create new ones to track quote work.
        </div>
        <Button
          onClick={() => handleAddTask('TO_DO')}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>
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
                onAddTask={handleAddTask}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                users={users}
              />
            )
          })}
        </div>

        <DragOverlay>
          {draggedTask ? <TaskCard task={draggedTask} isDragging onEdit={() => {}} onDelete={() => {}} users={users} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Add Task Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
            <DialogDescription>Create a new task for this {quoteId ? 'quote' : 'job'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitTask}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="assignedTo">Assign To</Label>
                <Select
                  value={formData.assignedTo || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, assignedTo: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Task</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
              <div>
                <Label htmlFor="edit-assignedTo">Assign To</Label>
                <Select
                  value={formData.assignedTo || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, assignedTo: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
  )
}

