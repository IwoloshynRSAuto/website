'use client'

import React from 'react'
import { useState, useEffect, useMemo, useRef } from 'react'
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
import { Plus, Trash2, Edit2, User, FileText, Wrench } from 'lucide-react'
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
import { TaskCodeSelector } from '@/components/tasks/task-code-selector'
import { Separator } from '@/components/ui/separator'
import { AddTaskModal } from '@/components/jobs/add-task-modal'

interface Task {
  id: string
  name: string
  title?: string
  description: string | null
  status: 'BACKLOG' | 'IN_PROGRESS' | 'WAITING' | 'COMPLETED' | 'TO_DO' | 'REVIEW' | 'DONE'
  assignedToId: string | null
  assignedTo?: string | null
  createdAt: string
  updatedAt: string
  taskCode?: string | null
  taskCodeDescription?: string | null
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

interface DevelopmentTaskBoardProps {
  userId: string
  users?: User[]
  isAdmin?: boolean
}

// Development task codes: PM060, PM070, PM080, PM090
const DEVELOPMENT_TASK_CODE_PREFIXES = ['PM060', 'PM070', 'PM080', 'PM090']

const STATUS_COLUMNS: Array<{
  id: 'BACKLOG' | 'IN_PROGRESS' | 'WAITING' | 'COMPLETED'
  label: string
  color: string
}> = [
  { id: 'BACKLOG', label: 'Backlog', color: 'bg-gray-100 border-gray-300' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-100 border-blue-300' },
  { id: 'WAITING', label: 'Waiting', color: 'bg-yellow-100 border-yellow-300' },
  { id: 'COMPLETED', label: 'Completed', color: 'bg-green-100 border-green-300' },
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

  const displayName = task.name || task.title || 'Untitled Task'
  const displayStatus = task.status === 'TO_DO' ? 'BACKLOG' : 
                       task.status === 'DONE' ? 'COMPLETED' : 
                       task.status === 'REVIEW' ? 'WAITING' : 
                       task.status

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="mb-3 p-4 bg-white rounded-lg shadow-sm border border-gray-200 relative hover:shadow-md transition-all duration-150"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-800">{displayName}</h4>
          {task.taskCode && (
            <div className="text-xs text-gray-500 mt-1">
              <span className="font-mono">{task.taskCode}</span>
              {task.taskCodeDescription && (
                <span className="ml-2">— {task.taskCodeDescription}</span>
              )}
            </div>
          )}
        </div>
        <Badge variant="secondary" className="text-xs ml-2">
          {displayStatus.replace('_', ' ')}
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
  id: 'BACKLOG' | 'IN_PROGRESS' | 'WAITING' | 'COMPLETED'
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

export function DevelopmentTaskBoard({ userId: initialUserId, users = [], isAdmin = false }: DevelopmentTaskBoardProps) {
  const { toast } = useToast()
  const router = useRouter()
  const { data: session } = useSession()
  const [selectedUserId, setSelectedUserId] = useState<string>(initialUserId)
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    assignedToId: null as string | null,
    dueDate: '',
    status: 'BACKLOG',
    taskCode: null as string | null,
    taskCodeDescription: null as string | null,
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
      // Fetch all tasks for the user
      const url = isAdmin && selectedUserId !== initialUserId 
        ? `/api/tasks/my-tasks?userId=${selectedUserId}`
        : '/api/tasks/my-tasks'
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to load tasks')
      }
      
      const data = await response.json()
      if (data.success) {
        // Filter tasks by development task codes (PM060, PM070, PM080, PM090)
        const allTasks = data.data || []
        const developmentTasks = allTasks.filter((task: Task) => {
          if (!task.taskCode) return false
          return DEVELOPMENT_TASK_CODE_PREFIXES.some(prefix => 
            task.taskCode?.startsWith(prefix)
          )
        })
        setTasks(developmentTasks)
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
      BACKLOG: [],
      IN_PROGRESS: [],
      WAITING: [],
      COMPLETED: [],
    }
    tasks.forEach(task => {
      // Map statuses
      let mappedStatus: keyof typeof grouped = 'BACKLOG'
      if (task.status === 'TO_DO') mappedStatus = 'BACKLOG'
      else if (task.status === 'IN_PROGRESS') mappedStatus = 'IN_PROGRESS'
      else if (task.status === 'REVIEW' || task.status === 'WAITING') mappedStatus = 'WAITING'
      else if (task.status === 'DONE' || task.status === 'COMPLETED') mappedStatus = 'COMPLETED'
      else if (task.status === 'BACKLOG') mappedStatus = 'BACKLOG'
      
      if (grouped[mappedStatus]) {
        grouped[mappedStatus].push(task)
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

    // Map status back
    let mappedStatus = newStatus
    if (newStatus === 'BACKLOG') mappedStatus = 'TO_DO'
    else if (newStatus === 'COMPLETED') mappedStatus = 'DONE'
    else if (newStatus === 'WAITING') mappedStatus = 'REVIEW'

    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: mappedStatus as Task['status'] } : t
    ))

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: mappedStatus }),
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

  const handleAddTask = async (taskData: {
    name: string
    description?: string
    assignedToId?: string
    dueDate?: string
    status: string
    taskCode?: string
    taskCodeDescription?: string
  }) => {
    try {
      // Ensure task code is a development code
      if (!taskData.taskCode || !DEVELOPMENT_TASK_CODE_PREFIXES.some(prefix => taskData.taskCode?.startsWith(prefix))) {
        toast({
          title: 'Error',
          description: 'Please select a development task code (PM060, PM070, PM080, or PM090)',
          variant: 'destructive',
        })
        return
      }

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskData.name,
          description: taskData.description || null,
          assigned_to: taskData.assignedToId || null,
          status: taskData.status === 'BACKLOG' ? 'TO_DO' : taskData.status,
          taskCode: taskData.taskCode || null,
          taskCodeDescription: taskData.taskCodeDescription || null,
        }),
      })

      const data = await response.json()
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create task')
      }

      toast({
        title: 'Success',
        description: 'Development task created successfully',
      })
      
      setIsAddModalOpen(false)
      setFormData({
        name: '',
        description: '',
        assignedToId: null,
        dueDate: '',
        status: 'BACKLOG',
        taskCode: null,
        taskCodeDescription: null,
      })
      await loadTasks()
    } catch (error: any) {
      console.error('Error creating task:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to create task',
        variant: 'destructive',
      })
    }
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setFormData({
      name: task.name || task.title || '',
      description: task.description || '',
      assignedToId: task.assignedToId || task.assignedTo || null,
      dueDate: '',
      status: task.status === 'TO_DO' ? 'BACKLOG' : 
              task.status === 'DONE' ? 'COMPLETED' : 
              task.status === 'REVIEW' ? 'WAITING' : 
              task.status,
      taskCode: task.taskCode || null,
      taskCodeDescription: task.taskCodeDescription || null,
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
    
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Task name is required',
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
          title: formData.name,
          description: formData.description || null,
          taskCode: formData.taskCode || null,
          taskCodeDescription: formData.taskCodeDescription || null,
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
      setFormData({ 
        name: '', 
        description: '', 
        assignedToId: null,
        dueDate: '',
        status: 'BACKLOG',
        taskCode: null,
        taskCodeDescription: null,
      })
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
        <DashboardHeader title="Development Tasks" subtitle="Development task management" />
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
        title="Development Tasks" 
        subtitle={`Development tasks for ${selectedUserName} (${tasks.length} total)`}
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

        {/* Add Task Button */}
        <div className="mb-6">
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Development Task
          </Button>
        </div>

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

          {/* Add Task Modal */}
          <AddTaskModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onAdd={handleAddTask}
            users={users}
          />

          {/* Edit Task Dialog */}
          <Dialog 
            open={isEditDialogOpen} 
            onOpenChange={(open) => {
              // Only close if the dialog is actually closing (not just a task code dialog interaction)
              if (!open && isEditDialogOpen) {
                // Small delay to check if a task code dialog is open
                setTimeout(() => {
                  const taskCodeDialog = document.querySelector('[data-task-code-dialog]')
                  if (!taskCodeDialog || window.getComputedStyle(taskCodeDialog as HTMLElement).display === 'none') {
                    setIsEditDialogOpen(false)
                    setEditingTask(null)
                    setFormData({ 
                      name: '', 
                      description: '', 
                      assignedToId: null,
                      dueDate: '',
                      status: 'BACKLOG',
                      taskCode: null,
                      taskCodeDescription: null,
                    })
                  }
                }, 150)
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Development Task</DialogTitle>
                <DialogDescription>Update task details</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitTask}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-name">Task Name *</Label>
                    <Input
                      id="edit-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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

                  <Separator className="my-4" />

                  {/* Development Section */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900">Development</h3>
                    <TaskCodeSelector
                      value={formData.taskCode || undefined}
                      onChange={(code, description) => {
                        setFormData({
                          ...formData,
                          taskCode: code,
                          taskCodeDescription: description,
                        })
                      }}
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


