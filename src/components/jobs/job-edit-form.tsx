'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { JOB_WORK_CODE_OPTIONS } from '@/lib/jobs/job-work-code-options'

interface User {
  id: string
  name: string | null
  email: string
}

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  isActive: boolean
}

interface Job {
  id: string
  jobNumber: string
  title: string
  description: string | null
  status: string
  priority: string
  startDate: Date | null
  endDate: Date | null
  estimatedHours: number | null
  actualHours: number | null
  assignedToId: string | null
  createdById: string
  // New fields
  customerId: string | null
  workCode: string | null
  estimatedCost: number | null
  dueTodayPercent: number | null
  fileLink: string | null
  createdAt: Date
  updatedAt: Date
  assignedTo: {
    id: string
    name: string | null
  } | null
  createdBy: {
    id: string
    name: string | null
  }
  customer: {
    id: string
    name: string
  } | null
}

interface JobEditFormProps {
  job: Job
  users: User[]
  customers: Customer[]
}

export function JobEditForm({ job, users, customers }: JobEditFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    title: job.title,
    description: job.description || '',
    status: job.status,
    priority: job.priority,
    startDate: job.startDate ? job.startDate.toISOString().split('T')[0] : '',
    endDate: job.endDate ? job.endDate.toISOString().split('T')[0] : '',
    estimatedHours: job.estimatedHours?.toString() || '',
    actualHours: job.actualHours?.toString() || '',
    assignedToId: job.assignedToId || 'unassigned',
    // New fields
    customerId: job.customerId || 'no-customer',
    workCode: job.workCode || 'no-work-code',
    estimatedCost: job.estimatedCost?.toString() || '',
    dueTodayPercent: job.dueTodayPercent?.toString() || '',
    fileLink: job.fileLink || '',
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }


  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          status: formData.status,
          priority: formData.priority,
          startDate: formData.startDate
            ? new Date(formData.startDate + 'T12:00:00').toISOString()
            : null,
          endDate: formData.endDate
            ? new Date(formData.endDate + 'T12:00:00').toISOString()
            : null,
          estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : null,
          actualHours: formData.actualHours ? parseFloat(formData.actualHours) : null,
          assignedToId: formData.assignedToId === 'unassigned' ? null : formData.assignedToId || null,
          // New fields
          customerId: formData.customerId === 'no-customer' ? null : formData.customerId || null,
          workCode: formData.workCode === 'no-work-code' ? null : formData.workCode || null,
          estimatedCost: formData.estimatedCost ? parseFloat(formData.estimatedCost) : null,
          dueTodayPercent: formData.dueTodayPercent ? parseFloat(formData.dueTodayPercent) : null,
          fileLink: formData.fileLink || null,
        }),
      })

      if (response.ok) {
        toast.success('Job updated successfully')
        router.push(`/dashboard/jobs/${job.id}`)
      } else {
        const errorData = await response.json()
        toast.error(`Failed to update job: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error updating job:', error)
      toast.error('Failed to update job')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href={`/dashboard/jobs/${job.id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Job
          </Button>
        </Link>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Job Title *</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter job title"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter job description"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="fileLink">File Link</Label>
              <Input
                id="fileLink"
                name="fileLink"
                value={formData.fileLink}
                onChange={handleInputChange}
                placeholder="L:\Projects\Job123 or file:///L:/Projects/Job123"
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the shared drive path (e.g., L:\Projects\Job123) or file:// URL
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status *</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => handleSelectChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="QUOTE">Quote</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="ON_HOLD">On Hold</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">Priority *</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(value) => handleSelectChange('priority', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hours & Assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="estimatedHours">Estimated Hours</Label>
                <Input
                  id="estimatedHours"
                  name="estimatedHours"
                  type="number"
                  step="0.25"
                  min="0"
                  value={formData.estimatedHours}
                  onChange={handleInputChange}
                  placeholder="0.0"
                />
              </div>

              <div>
                <Label htmlFor="actualHours">Actual Hours</Label>
                <Input
                  id="actualHours"
                  name="actualHours"
                  type="number"
                  step="0.25"
                  min="0"
                  value={formData.actualHours}
                  onChange={handleInputChange}
                  placeholder="0.0"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="assignedToId">Assigned To</Label>
              <Select 
                value={formData.assignedToId} 
                onValueChange={(value) => handleSelectChange('assignedToId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || 'Unnamed User'} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <SearchableSelect
                label="Customer"
                options={[
                  { value: 'no-customer', label: 'No Customer' },
                  ...customers.map(customer => ({
                    value: customer.id,
                    label: customer.name,
                    searchText: `${customer.name} ${customer.email || ''} ${customer.phone || ''}`
                  }))
                ]}
                value={formData.customerId}
                onValueChange={(value) => handleSelectChange('customerId', value)}
                placeholder="Select a customer"
                emptyMessage="No customers found."
              />
            </div>

            <div className="pt-4 border-t">
              <div className="text-sm text-gray-600">
                <p><strong>Created by:</strong> {job.createdBy.name}</p>
                <p><strong>Created:</strong> {new Date(job.createdAt).toLocaleDateString()}</p>
                <p><strong>Last updated:</strong> {new Date(job.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Job Estimate & Cost Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Job Estimate & Cost Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="workCode">Work Code</Label>
              <Select 
                value={formData.workCode} 
                onValueChange={(value) => handleSelectChange('workCode', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select work code" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-work-code">No Work Code</SelectItem>
                  {JOB_WORK_CODE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="estimatedHours">Estimated Hours</Label>
              <Input
                id="estimatedHours"
                name="estimatedHours"
                type="number"
                step="0.25"
                min="0"
                value={formData.estimatedHours}
                onChange={handleInputChange}
                placeholder="0.0"
              />
            </div>

            <div>
              <Label htmlFor="hourlyRate">Hourly Rate</Label>
              <Input
                id="hourlyRate"
                name="hourlyRate"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                disabled
                className="bg-gray-100"
              />
            </div>

            <div>
              <Label htmlFor="estimatedCost">Estimated Cost</Label>
              <Input
                id="estimatedCost"
                name="estimatedCost"
                type="number"
                step="0.01"
                min="0"
                value={formData.estimatedCost}
                onChange={handleInputChange}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <Label htmlFor="dueTodayPercent">Due Today %</Label>
              <Input
                id="dueTodayPercent"
                name="dueTodayPercent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.dueTodayPercent}
                onChange={handleInputChange}
                placeholder="0"
              />
            </div>

            <div>
              <Label>Due Today Amount</Label>
              <Input
                value={formData.estimatedCost && formData.dueTodayPercent 
                  ? (parseFloat(formData.estimatedCost) * parseFloat(formData.dueTodayPercent) / 100).toFixed(2)
                  : '0.00'
                }
                disabled
                className="bg-gray-100"
              />
            </div>

            <div>
              <Label>Remaining Amount</Label>
              <Input
                value={formData.estimatedCost && formData.dueTodayPercent 
                  ? (parseFloat(formData.estimatedCost) * (100 - parseFloat(formData.dueTodayPercent)) / 100).toFixed(2)
                  : formData.estimatedCost || '0.00'
                }
                disabled
                className="bg-gray-100"
              />
            </div>
          </div>

          <div className="pt-4 border-t">
            <div>
              <Label htmlFor="fileLink">File Link</Label>
              <Input
                id="fileLink"
                name="fileLink"
                value={formData.fileLink}
                onChange={handleInputChange}
                placeholder="L:\Projects\Job123 or file:///L:/Projects/Job123"
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the shared drive path (e.g., L:\Projects\Job123) or file:// URL
              </p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Cost Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total Estimated Cost:</span>
                  <span className="font-medium ml-2">
                    ${formData.estimatedCost || '0.00'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Due Today:</span>
                  <span className="font-medium ml-2">
                    ${formData.estimatedCost && formData.dueTodayPercent 
                      ? (parseFloat(formData.estimatedCost) * parseFloat(formData.dueTodayPercent) / 100).toFixed(2)
                      : '0.00'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
