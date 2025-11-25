'use client'

import { useState, useMemo, useEffect } from 'react'
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
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { Search, Plus, Trash2, Edit2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

interface Task {
    id: string
    title: string
    description: string
    status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'
    createdAt: string
    updatedAt: string
}

const STATUS_COLUMNS: Array<{
    id: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'
    label: string
    color: string
}> = [
        { id: 'TODO', label: 'To Do', color: 'bg-gray-100 border-gray-300' },
        { id: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-100 border-blue-300' },
        { id: 'REVIEW', label: 'Review', color: 'bg-yellow-100 border-yellow-300' },
        { id: 'DONE', label: 'Done', color: 'bg-green-100 border-green-300' },
    ]

const STORAGE_KEY = 'task-board-tasks'

export function TaskBoard() {
    const [tasks, setTasks] = useState<Task[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [activeId, setActiveId] = useState<string | null>(null)
    const [draggedTask, setDraggedTask] = useState<Task | null>(null)
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [newTaskTitle, setNewTaskTitle] = useState('')
    const [editingTask, setEditingTask] = useState<Task | null>(null)

    const [newTaskDescription, setNewTaskDescription] = useState('')

    // Load tasks from localStorage on mount
    useEffect(() => {
        if (typeof window === 'undefined') return

        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
            try {
                const parsedTasks = JSON.parse(stored)
                setTasks(parsedTasks)
            } catch (error) {
                console.error('Failed to load tasks from localStorage:', error)
            }
        }
    }, [])

    // Save tasks to localStorage whenever they change
    useEffect(() => {
        if (typeof window === 'undefined') return

        if (tasks.length > 0 || localStorage.getItem(STORAGE_KEY)) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
        }
    }, [tasks])

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    // Filter tasks by search query
    const filteredTasks = useMemo(() => {
        if (!searchQuery.trim()) return tasks

        const query = searchQuery.toLowerCase()
        return tasks.filter(
            (task) =>
                task.title.toLowerCase().includes(query) ||
                task.description.toLowerCase().includes(query)
        )
    }, [tasks, searchQuery])

    // Group tasks by status
    const tasksByStatus = useMemo(() => {
        const grouped: Record<string, Task[]> = {
            TODO: [],
            IN_PROGRESS: [],
            REVIEW: [],
            DONE: [],
        }

        filteredTasks.forEach((task) => {
            if (task.status in grouped) {
                grouped[task.status].push(task)
            }
        })

        return grouped
    }, [filteredTasks])

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event
        const task = tasks.find((t) => t.id === active.id)
        setActiveId(active.id as string)
        setDraggedTask(task || null)
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        console.log('handleDragEnd called', { activeId: active.id, overId: over?.id })

        setActiveId(null)
        setDraggedTask(null)

        if (!over) {
            console.log('No over target, returning')
            return
        }

        // If dropped on itself, do nothing
        if (active.id === over.id) {
            console.log('Dropped on itself, returning')
            return
        }

        const taskId = active.id as string
        const task = tasks.find((t) => t.id === taskId)

        if (!task) {
            console.log('Task not found:', taskId)
            return
        }

        // Determine the new status based on what was dropped on
        let newStatus: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'

        // Check if dropped directly on a column
        const columnIds = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']
        if (columnIds.includes(over.id as string)) {
            newStatus = over.id as 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'
            console.log('Dropped on column:', newStatus)
        } else {
            // Dropped on a task, find which column that task is in
            const targetTask = tasks.find((t) => t.id === over.id)
            if (!targetTask) {
                console.log('Target task not found:', over.id, 'Available tasks:', tasks.map(t => t.id))
                return
            }
            newStatus = targetTask.status
            console.log('Dropped on task, using status:', newStatus)
        }

        if (task.status === newStatus) {
            console.log('Status unchanged, returning')
            return
        }

        console.log('Updating task status from', task.status, 'to', newStatus)

        // Update task status
        const updatedTasks = tasks.map((t) =>
            t.id === taskId ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t
        )
        setTasks(updatedTasks)

        toast.success(`Moved task to ${STATUS_COLUMNS.find(c => c.id === newStatus)?.label || newStatus}`)
    }

    const handleAddTask = () => {
        if (!newTaskTitle.trim()) {
            toast.error('Please enter a task title')
            return
        }

        const newTask: Task = {
            id: `task-${Date.now()}`,
            title: newTaskTitle,
            description: newTaskDescription,
            status: 'TODO',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }

        setTasks([...tasks, newTask])
        setNewTaskTitle('')
        setNewTaskDescription('')
        setIsAddDialogOpen(false)
        toast.success('Task created successfully')
    }

    const handleDeleteTask = (taskId: string) => {
        setTasks(tasks.filter(t => t.id !== taskId))
        toast.success('Task deleted')
    }

    const handleUpdateTask = () => {
        if (!editingTask || !editingTask.title.trim()) {
            toast.error('Please enter a task title')
            return
        }

        const updatedTasks = tasks.map((t) =>
            t.id === editingTask.id
                ? {
                    ...editingTask,
                    updatedAt: new Date().toISOString(),
                }
                : t
        )

        setTasks(updatedTasks)
        setEditingTask(null)
        toast.success('Task updated successfully')
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Task Board
                </h1>
                <p className="text-gray-600">
                    Drag and drop tasks between columns to update their status
                </p>
            </div>

            {/* Search and Add */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        type="text"
                        placeholder="Search tasks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>

                <Button onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                </Button>
            </div>

            {/* Board */}
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
                                onDeleteTask={handleDeleteTask}
                                onEditTask={setEditingTask}
                            />
                        )
                    })}
                </div>

                <DragOverlay>
                    {draggedTask ? <TaskCard task={draggedTask} isDragging /> : null}
                </DragOverlay>
            </DndContext>

            {/* Add Task Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Task</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Title</label>
                            <Input
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                placeholder="Enter task title"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">Description</label>
                            <Textarea
                                value={newTaskDescription}
                                onChange={(e) => setNewTaskDescription(e.target.value)}
                                placeholder="Enter task description (optional)"
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddTask}>
                            Create Task
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Task Dialog */}
            <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Task</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Title</label>
                            <Input
                                value={editingTask?.title || ''}
                                onChange={(e) =>
                                    setEditingTask((prev) =>
                                        prev ? { ...prev, title: e.target.value } : null
                                    )
                                }
                                placeholder="Enter task title"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">Description</label>
                            <Textarea
                                value={editingTask?.description || ''}
                                onChange={(e) =>
                                    setEditingTask((prev) =>
                                        prev ? { ...prev, description: e.target.value } : null
                                    )
                                }
                                placeholder="Enter task description (optional)"
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingTask(null)}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdateTask}>
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

interface StatusColumnProps {
    id: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'
    label: string
    color: string
    tasks: Task[]
    onDeleteTask: (taskId: string) => void
    onEditTask: (task: Task) => void
}

function StatusColumn({ id, label, color, tasks, onDeleteTask, onEditTask }: StatusColumnProps) {
    const taskIds = tasks.map((t) => t.id)
    const { setNodeRef } = useDroppable({ id })

    return (
        <div className="flex flex-col h-full">
            <div className={`${color} rounded-t-lg p-3 border-b-2`}>
                <h2 className="font-semibold text-gray-800">{label}</h2>
                <p className="text-sm text-gray-600 mt-1">{tasks.length} tasks</p>
            </div>
            <div
                ref={setNodeRef}
                className="flex-1 bg-white rounded-b-lg border-2 border-t-0 p-3 min-h-[400px] max-h-[calc(100vh-300px)] overflow-y-auto"
            >
                <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                        {tasks.map((task) => (
                            <SortableTaskCard
                                key={task.id}
                                task={task}
                                onDeleteTask={onDeleteTask}
                                onEditTask={onEditTask}
                            />
                        ))}
                        {tasks.length === 0 && (
                            <div className="text-center text-gray-400 py-8 text-sm">
                                No tasks
                            </div>
                        )}
                    </div>
                </SortableContext>
            </div>
        </div>
    )
}

interface SortableTaskCardProps {
    task: Task
    onDeleteTask: (taskId: string) => void
    onEditTask: (task: Task) => void
}

function SortableTaskCard({ task, onDeleteTask, onEditTask }: SortableTaskCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <div ref={setNodeRef} style={style}>
            <TaskCard
                task={task}
                isDragging={isDragging}
                dragHandleProps={{ ...attributes, ...listeners }}
                onDeleteTask={onDeleteTask}
                onEditTask={onEditTask}
            />
        </div>
    )
}

interface TaskCardProps {
    task: Task
    isDragging?: boolean
    dragHandleProps?: React.HTMLAttributes<HTMLElement>
    onDeleteTask?: (taskId: string) => void
    onEditTask?: (task: Task) => void
}

function TaskCard({
    task,
    isDragging = false,
    dragHandleProps,
    onDeleteTask,
    onEditTask,
}: TaskCardProps) {
    return (
        <Card
            className={`p-4 cursor-move hover:shadow-md transition-shadow ${isDragging ? 'shadow-lg' : ''
                }`}
            {...dragHandleProps}
        >
            <div className="space-y-2">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <h3 className="font-semibold text-sm text-gray-900">
                            {task.title}
                        </h3>
                        {task.description && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-3">
                                {task.description}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center ml-2">
                        {onEditTask && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onEditTask(task)
                                }}
                                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                onPointerDown={(e) => e.stopPropagation()}
                            >
                                <Edit2 className="h-4 w-4" />
                            </button>
                        )}
                        {onDeleteTask && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onDeleteTask(task.id)
                                }}
                                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                onPointerDown={(e) => e.stopPropagation()}
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="text-xs text-gray-400">
                    Updated: {format(new Date(task.updatedAt), 'MMM d, yyyy h:mm a')}
                </div>
            </div>
        </Card>
    )
}
