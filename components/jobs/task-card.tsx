'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, User, Trash2, Edit2, Check, X } from 'lucide-react'
import { format } from 'date-fns'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

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

interface TaskCardProps {
    task: Task
    users: Array<{ id: string; name: string | null; email: string }>
    onUpdate: (taskId: string, updates: Partial<Task>) => void
    onDelete: (taskId: string) => void
}

export function TaskCard({ task, users, onUpdate, onDelete }: TaskCardProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editData, setEditData] = useState({
        name: task.name,
        description: task.description || '',
        assignedToId: task.assignedToId || '',
        dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
    })

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

    const handleSave = () => {
        onUpdate(task.id, {
            name: editData.name,
            description: editData.description || null,
            assignedToId: editData.assignedToId || null,
            dueDate: editData.dueDate || null,
        })
        setIsEditing(false)
    }

    const handleCancel = () => {
        setEditData({
            name: task.name,
            description: task.description || '',
            assignedToId: task.assignedToId || '',
            dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
        })
        setIsEditing(false)
    }

    if (isEditing) {
        return (
            <Card className="p-3 bg-white border-blue-500 border-2">
                <div className="space-y-2">
                    <Input
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        placeholder="Task name"
                        className="font-medium"
                    />
                    <Textarea
                        value={editData.description}
                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                        placeholder="Description (optional)"
                        rows={2}
                        className="text-sm"
                    />
                    <Select
                        value={editData.assignedToId || 'none'}
                        onValueChange={(value) => setEditData({ ...editData, assignedToId: value === 'none' ? '' : value })}
                    >
                        <SelectTrigger className="text-sm">
                            <SelectValue placeholder="Assign to..." />
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
                    <Input
                        type="date"
                        value={editData.dueDate}
                        onChange={(e) => setEditData({ ...editData, dueDate: e.target.value })}
                        className="text-sm"
                    />
                    <div className="flex gap-2">
                        <Button onClick={handleSave} size="sm" className="flex-1">
                            <Check className="h-4 w-4 mr-1" />
                            Save
                        </Button>
                        <Button onClick={handleCancel} variant="outline" size="sm" className="flex-1">
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                        </Button>
                    </div>
                </div>
            </Card>
        )
    }

    return (
        <Card
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="p-3 bg-white hover:shadow-md transition-shadow cursor-move"
        >
            <div className="space-y-2">
                <div className="flex items-start justify-between">
                    <h4 className="font-medium text-sm flex-1">{task.name}</h4>
                    <div className="flex gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                                e.stopPropagation()
                                setIsEditing(true)
                            }}
                        >
                            <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                            onClick={(e) => {
                                e.stopPropagation()
                                onDelete(task.id)
                            }}
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                </div>

                {task.description && (
                    <p className="text-xs text-gray-600 line-clamp-2">{task.description}</p>
                )}

                <div className="flex items-center gap-3 text-xs text-gray-500">
                    {task.assignedTo && (
                        <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{task.assignedTo.name || task.assignedTo.email}</span>
                        </div>
                    )}
                    {task.dueDate && (
                        <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{format(new Date(task.dueDate), 'MMM d')}</span>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    )
}
