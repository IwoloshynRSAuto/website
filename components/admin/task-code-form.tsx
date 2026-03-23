'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'

interface TaskCode {
  id?: string
  code: string
  description: string
  category: 'PM' | 'SV' | 'AD'
  isActive: boolean
}

interface TaskCodeFormProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  taskCode?: TaskCode | null
}

export function TaskCodeForm({ isOpen, onClose, onSave, taskCode }: TaskCodeFormProps) {
  const [formData, setFormData] = useState<TaskCode>({
    code: '',
    description: '',
    category: 'PM',
    isActive: true,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (taskCode) {
      setFormData({
        code: taskCode.code,
        description: taskCode.description,
        category: taskCode.category,
        isActive: taskCode.isActive,
      })
    } else {
      setFormData({
        code: '',
        description: '',
        category: 'PM',
        isActive: true,
      })
    }
    setError(null)
  }, [taskCode, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const url = taskCode?.id ? `/api/task-codes/${taskCode.id}` : '/api/task-codes'
      const method = taskCode?.id ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save task code')
      }

      onSave()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save task code')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{taskCode ? 'Edit Task Code' : 'Add Task Code'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="code">Code *</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="e.g., PM010-0100"
              required
              disabled={!!taskCode?.id}
            />
            {taskCode?.id && (
              <p className="text-xs text-gray-500 mt-1">Code cannot be changed after creation</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter task code description"
              required
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(value: 'PM' | 'SV' | 'AD') => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PM">Project Management (PM)</SelectItem>
                <SelectItem value="SV">Service (SV)</SelectItem>
                <SelectItem value="AD">Administrative (AD)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="isActive">Active</Label>
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : taskCode ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

