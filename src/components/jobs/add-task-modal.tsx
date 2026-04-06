'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

interface AddTaskModalProps {
    isOpen: boolean
    onClose: () => void
    onAdd: (taskData: {
        name: string
        description?: string
        assignedToId?: string
        dueDate?: string
        status: string
        taskCode?: string
        taskCodeDescription?: string
    }) => void
    users: Array<{ id: string; name: string | null; email: string }>
    jobId?: string
    quoteId?: string
    initialTaskCode?: string
}

export function AddTaskModal({ isOpen, onClose, onAdd, users, jobId, initialTaskCode }: AddTaskModalProps) {
    // Valid statuses constant
    const VALID_STATUSES = ['BACKLOG', 'IN_PROGRESS', 'WAITING', 'COMPLETED'] as const
    type ValidStatus = typeof VALID_STATUSES[number]
    
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        assignedToId: null as string | null,
        dueDate: '',
        status: 'BACKLOG' as ValidStatus,
        taskCode: null as string | null,
        taskCodeDescription: null as string | null,
    })

    // Auto-fill task code if provided (e.g., from job) or from localStorage
    useEffect(() => {
        if (isOpen) {
            // Check localStorage for selected task code
            const stored = localStorage.getItem('selectedTaskCode')
            if (stored) {
                try {
                    const { code, description } = JSON.parse(stored)
                    setFormData(prev => ({ 
                        ...prev, 
                        taskCode: code,
                        taskCodeDescription: description,
                    }))
                    // Clear after using
                    localStorage.removeItem('selectedTaskCode')
                } catch (e) {
                    console.error('Failed to parse stored task code:', e)
                }
            } else if (initialTaskCode) {
                setFormData(prev => ({ ...prev, taskCode: initialTaskCode }))
            }
        }
    }, [initialTaskCode, isOpen])
    
    // Reset form when dialog closes
    useEffect(() => {
        if (!isOpen) {
            setFormData({
                name: '',
                description: '',
                assignedToId: null,
                dueDate: '',
                status: 'BACKLOG',
                taskCode: null,
                taskCodeDescription: null,
            })
        } else {
            // When opening, ensure status is valid (defensive check)
            const currentStatus = String(formData.status || '').trim().toUpperCase()
            if (!VALID_STATUSES.includes(currentStatus as ValidStatus)) {
                console.warn('Invalid status on modal open:', formData.status, '- resetting to BACKLOG')
                setFormData(prev => ({ ...prev, status: 'BACKLOG' }))
            }
        }
    }, [isOpen])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.name.trim()) {
            return
        }

        // SIMPLIFIED APPROACH: Always use BACKLOG for new tasks
        // This ensures we never have status corruption issues
        const validStatus = 'BACKLOG'

        console.log('[AddTaskModal] Submitting task with hardcoded status:', validStatus)

        onAdd({
            name: formData.name,
            description: formData.description || undefined,
            assignedToId: formData.assignedToId ?? undefined,
            dueDate: formData.dueDate || undefined,
            status: validStatus,
            taskCode: formData.taskCode || undefined,
            taskCodeDescription: formData.taskCodeDescription || undefined,
        })

        // Reset form
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

    const handleClose = () => {
        onClose()
    }

    return (
        <Dialog 
            open={isOpen} 
            onOpenChange={(open) => {
                if (!open) {
                    handleClose()
                }
            }}
        >
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

                    {/* Status field removed - always using BACKLOG for new tasks to prevent corruption issues */}
                    {/* Users can change status after creation via drag-and-drop */}

                    <Separator className="my-4" />

                    <div>
                        <Label htmlFor="taskCode">Task Code (optional)</Label>
                        <Input
                            id="taskCode"
                            value={formData.taskCode || ''}
                            onChange={(e) => setFormData({ ...formData, taskCode: e.target.value || null, taskCodeDescription: null })}
                            placeholder="e.g. CD, PB, EE"
                        />
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
