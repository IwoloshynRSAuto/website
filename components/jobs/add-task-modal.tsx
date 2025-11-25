'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface AddTaskModalProps {
    isOpen: boolean
    onClose: () => void
    onAdd: (taskData: {
        name: string
        description?: string
        assignedToId?: string
        dueDate?: string
        status: string
    }) => void
    users: Array<{ id: string; name: string | null; email: string }>
}

export function AddTaskModal({ isOpen, onClose, onAdd, users }: AddTaskModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        assignedToId: null,
        dueDate: '',
        status: 'BACKLOG',
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.name.trim()) {
            return
        }

        onAdd({
            name: formData.name,
            description: formData.description || undefined,
            assignedToId: formData.assignedToId ?? undefined,
            dueDate: formData.dueDate || undefined,
            status: formData.status,
        })

        // Reset form
        setFormData({
            name: '',
            description: '',
            assignedToId: null,
            dueDate: '',
            status: 'BACKLOG',
        })
    }

    const handleClose = () => {
        setFormData({
            name: '',
            description: '',
            assignedToId: null,
            dueDate: '',
            status: 'BACKLOG',
        })
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add New Task</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="name">Task Name *</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Enter task name"
                            required
                        />
                    </div>

                    <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Enter task description (optional)"
                            rows={3}
                        />
                    </div>

                    <div>
                        <Label htmlFor="assignedTo">Assign To</Label>
                        <Select
                            value={formData.assignedToId ?? 'none'}
                            onValueChange={(value) => setFormData({ ...formData, assignedToId: value === 'none' ? null : value })}
                        >
                            <SelectTrigger id="assignedTo">
                                <SelectValue placeholder="Select assignee (optional)" />
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

                    <div>
                        <Label htmlFor="dueDate">Due Date</Label>
                        <Input
                            id="dueDate"
                            type="date"
                            value={formData.dueDate}
                            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                        />
                    </div>

                    <div>
                        <Label htmlFor="status">Initial Status</Label>
                        <Select
                            value={formData.status}
                            onValueChange={(value) => setFormData({ ...formData, status: value })}
                        >
                            <SelectTrigger id="status">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="BACKLOG">Backlog</SelectItem>
                                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                <SelectItem value="WAITING">Waiting</SelectItem>
                                <SelectItem value="COMPLETED">Completed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex gap-2 pt-4">
                        <Button type="submit" className="flex-1">
                            Add Task
                        </Button>
                        <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                            Cancel
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
