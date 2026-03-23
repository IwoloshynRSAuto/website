'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { TaskCard } from './task-card'
import { AddTaskModal } from './add-task-modal'
import { toast } from 'react-hot-toast'
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    closestCorners,
    useDroppable,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

interface Task {
    id: string
    name: string
    description: string | null
    assignedToId: string | null
    assignedTo: {
        id: string
        name: string | null
        email: string
    } | null
    dueDate: string | null
    status: string
    position: number
}

interface KanbanBoardProps {
    jobId?: string
    quoteId?: string
    jobType: 'JOB' | 'QUOTE'
    users: Array<{ id: string; name: string | null; email: string }>
}

const COLUMNS = [
    { id: 'BACKLOG', title: 'Backlog', color: 'bg-gray-100' },
    { id: 'IN_PROGRESS', title: 'In Progress', color: 'bg-blue-100' },
    { id: 'WAITING', title: 'Waiting', color: 'bg-yellow-100' },
    { id: 'COMPLETED', title: 'Completed', color: 'bg-green-100' },
]

// Column component with droppable support
function ColumnDroppable({
    columnId,
    column,
    tasks,
    users,
    onUpdate,
    onDelete,
}: {
    columnId: string
    column: { id: string; title: string; color: string }
    tasks: Task[]
    users: Array<{ id: string; name: string | null; email: string }>
    onUpdate: (taskId: string, updates: Partial<Task>) => void
    onDelete: (taskId: string) => void
}) {
    const { setNodeRef } = useDroppable({
        id: `column-${columnId}`,
    })

    return (
        <div className="flex flex-col">
            <div className={`${column.color} rounded-t-lg px-4 py-2 font-semibold`}>
                {column.title}
                <span className="ml-2 text-sm font-normal text-gray-600">
                    ({tasks.length})
                </span>
            </div>
            <div
                ref={setNodeRef}
                className="flex-1 bg-gray-50 rounded-b-lg p-2 min-h-[200px] space-y-2"
            >
                <SortableContext
                    id={`column-${columnId}`}
                    items={tasks.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {tasks.map((task) => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            users={users}
                            onUpdate={onUpdate}
                            onDelete={onDelete}
                        />
                    ))}
                </SortableContext>
            </div>
        </div>
    )
}

export function KanbanBoard({ jobId, quoteId, jobType, users }: KanbanBoardProps) {
    const [tasks, setTasks] = useState<Task[]>([])
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [activeId, setActiveId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    )

    const entityId = jobType === 'JOB' ? jobId : quoteId
    const apiBase = jobType === 'JOB' ? `/api/jobs/${entityId}` : `/api/quotes/${entityId}`

    useEffect(() => {
        fetchTasks()
    }, [entityId])

    const fetchTasks = async () => {
        try {
            const response = await fetch(`${apiBase}/tasks`)
            if (response.ok) {
                const data = await response.json()
                setTasks(data.data || [])
            }
        } catch (error) {
            console.error('Error fetching tasks:', error)
            toast.error('Failed to load tasks')
        } finally {
            setIsLoading(false)
        }
    }

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string)
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event
        setActiveId(null)

        if (!over) return

        const activeTask = tasks.find((t) => t.id === active.id)
        if (!activeTask) return

        // Extract status from the droppable container id
        const newStatus = over.id.toString().replace('column-', '')

        // Only update if status changed
        if (activeTask.status !== newStatus) {
            // Optimistically update UI
            setTasks((prev) =>
                prev.map((task) =>
                    task.id === activeTask.id ? { ...task, status: newStatus } : task
                )
            )

            // Update on server
            try {
                const response = await fetch(`${apiBase}/tasks/${activeTask.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus }),
                })

                if (!response.ok) {
                    throw new Error('Failed to update task')
                }

                const data = await response.json()
                if (data.success) {
                    // Refresh tasks to get the latest data from server
                    await fetchTasks()
                    toast.success('Task moved successfully')
                } else {
                    throw new Error(data.error || 'Failed to update task')
                }
            } catch (error) {
                console.error('Error updating task:', error)
                toast.error('Failed to move task')
                // Revert on error by refreshing from server
                await fetchTasks()
            }
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
            const response = await fetch(`${apiBase}/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: taskData.name,
                    description: taskData.description || null,
                    assignedToId: taskData.assignedToId || null,
                    dueDate: taskData.dueDate || null,
                    status: taskData.status || 'BACKLOG',
                    taskCode: taskData.taskCode || null,
                    taskCodeDescription: taskData.taskCodeDescription || null,
                }),
            })

            if (response.ok) {
                const data = await response.json()
                setTasks((prev) => [...prev, data.data])
                toast.success('Task created successfully')
                setIsAddModalOpen(false)
            } else {
                throw new Error('Failed to create task')
            }
        } catch (error) {
            console.error('Error creating task:', error)
            toast.error('Failed to create task')
        }
    }

    const handleUpdateTask = async (
        taskId: string,
        updates: Partial<Task>
    ) => {
        try {
            const response = await fetch(`${apiBase}/tasks/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            })

            if (response.ok) {
                const data = await response.json()
                setTasks((prev) =>
                    prev.map((task) => (task.id === taskId ? data.data : task))
                )
                toast.success('Task updated successfully')
            } else {
                throw new Error('Failed to update task')
            }
        } catch (error) {
            console.error('Error updating task:', error)
            toast.error('Failed to update task')
        }
    }

    const handleDeleteTask = async (taskId: string) => {
        if (!confirm('Are you sure you want to delete this task?')) return

        try {
            const response = await fetch(`${apiBase}/tasks/${taskId}`, {
                method: 'DELETE',
            })

            if (response.ok) {
                setTasks((prev) => prev.filter((task) => task.id !== taskId))
                toast.success('Task deleted successfully')
            } else {
                throw new Error('Failed to delete task')
            }
        } catch (error) {
            console.error('Error deleting task:', error)
            toast.error('Failed to delete task')
        }
    }

    const getTasksByStatus = (status: string) => {
        return tasks.filter((task) => task.status === status)
    }

    const activeTask = tasks.find((task) => task.id === activeId)

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Task Board</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-500">Loading tasks...</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Task Board</CardTitle>
                    <Button onClick={() => setIsAddModalOpen(true)} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Task
                    </Button>
                </CardHeader>
                <CardContent>
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCorners}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {COLUMNS.map((column) => {
                                const columnTasks = getTasksByStatus(column.id)
                                return (
                                    <ColumnDroppable
                                        key={column.id}
                                        columnId={column.id}
                                        column={column}
                                        tasks={columnTasks}
                                        users={users}
                                        onUpdate={handleUpdateTask}
                                        onDelete={handleDeleteTask}
                                    />
                                )
                            })}
                        </div>

                        <DragOverlay>
                            {activeTask ? (
                                <div className="bg-white p-3 rounded-lg shadow-lg border-2 border-blue-500 opacity-90">
                                    <p className="font-medium">{activeTask.name}</p>
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                </CardContent>
            </Card>

            <AddTaskModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={handleAddTask}
                users={users}
            />
        </>
    )
}
