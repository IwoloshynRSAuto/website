'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { DeleteJobButton } from '@/components/jobs/delete-job-button'
import { ArrowLeft, Calendar, Save, X } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import { useToast } from '@/components/ui/use-toast'

interface Job {
  id: string
  jobNumber: string
  title: string
  description: string | null
  type: string
  status: string
  priority: string
  startDate: Date | null
  endDate: Date | null
  estimatedHours: number | null
  actualHours: number | null
  assignedToId: string | null
  createdById: string
  customerId: string | null
  workCode: string | null
  estimatedCost: number | null
  dueTodayPercent: number | null
  inQuickBooks: boolean
  inLDrive: boolean
  fileLink: string | null
  quoteId: string | null
  createdAt: Date
  updatedAt: Date
  assignedTo: {
    id: string
    name: string | null
  } | null
  createdBy: {
    name: string | null
  }
  customer: {
    id: string
    name: string
    email: string | null
    phone: string | null
    address: string | null
    isActive: boolean
  } | null
  quote: {
    id: string
    quoteNumber: string
    quoteFile: string | null
  } | null
  _count: {
    timeEntries: number
  }
}

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

interface JobDetailsEditableProps {
  job: Job
  users: User[]
  customers: Customer[]
}

export function JobDetailsEditable({ job, users, customers }: JobDetailsEditableProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    title: job.title,
    description: job.description || '',
    status: job.status,
    priority: job.priority,
    startDate: job.startDate ? format(new Date(job.startDate), 'yyyy-MM-dd') : '',
    endDate: job.endDate ? format(new Date(job.endDate), 'yyyy-MM-dd') : '',
    assignedToId: job.assignedToId || 'unassigned',
    customerId: job.customerId || 'no-customer',
    workCode: job.workCode || 'no-work-code',
    notes: '',
    inQuickBooks: job.inQuickBooks,
    inLDrive: job.inLDrive,
    fileLink: job.fileLink || '',
  })

  const [isLoading, setIsLoading] = useState(false)

  const handleUpgradeToJob = async () => {
    if (!confirm('Convert this quote to an active job? A new job record will be created and linked to this quote.')) {
      return
    }
    setIsLoading(true)
    try {
      const response = await fetch(`/api/jobs/convert-quote/${job.id}`, { method: 'POST' })
      if (response.ok) {
        const newJob = await response.json()
        toast({ title: `Quote converted to job ${newJob.jobNumber}` })
        window.location.href = `/dashboard/jobs/${newJob.id}`
      } else {
        const errorData = await response.json()
        toast({ title: 'Failed to convert quote', description: errorData.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Failed to convert quote', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
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
          startDate: formData.startDate ? new Date(formData.startDate + 'T12:00:00').toISOString() : null,
          endDate: formData.endDate ? new Date(formData.endDate + 'T12:00:00').toISOString() : null,
          assignedToId: formData.assignedToId === 'unassigned' ? null : formData.assignedToId,
          customerId: formData.customerId === 'no-customer' ? null : formData.customerId,
          workCode: formData.workCode === 'no-work-code' ? null : formData.workCode,
          inQuickBooks: formData.inQuickBooks,
          inLDrive: formData.inLDrive,
          fileLink: formData.fileLink || null,
        }),
      })

      if (response.ok) {
        toast({ title: 'Job updated successfully' })
        window.location.reload()
      } else {
        const errorData = await response.json()
        toast({ title: 'Failed to update job', description: errorData.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Failed to update job', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      title: job.title,
      description: job.description || '',
      status: job.status,
      priority: job.priority,
      startDate: job.startDate ? format(new Date(job.startDate), 'yyyy-MM-dd') : '',
      endDate: job.endDate ? format(new Date(job.endDate), 'yyyy-MM-dd') : '',
      assignedToId: job.assignedToId || 'unassigned',
      customerId: job.customerId || 'no-customer',
      inQuickBooks: job.inQuickBooks,
      inLDrive: job.inLDrive,
      workCode: job.workCode || 'no-work-code',
      notes: '',
      fileLink: job.fileLink || '',
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/jobs">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Jobs
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{job.jobNumber}</h1>
            <p className="text-gray-600">{job.title}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleSave} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          {job.type === 'QUOTE' && (
            <Button variant="outline" onClick={handleUpgradeToJob} disabled={isLoading}>
              Convert to Job
            </Button>
          )}
          <DeleteJobButton jobId={job.id} jobNumber={job.jobNumber} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="job-title">Job Title</Label>
              <Input
                id="job-title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="job-desc">Description</Label>
              <Textarea
                id="job-desc"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="job-status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger id="job-status">
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
              <div className="space-y-1">
                <Label htmlFor="job-priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger id="job-priority">
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
              <div className="space-y-1">
                <Label htmlFor="job-start">Start Date</Label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                  <Input
                    id="job-start"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="job-end">End Date</Label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                  <Input
                    id="job-end"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team & Customer */}
        <Card>
          <CardHeader>
            <CardTitle>Team & Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
              onValueChange={(value) => setFormData(prev => ({ ...prev, customerId: value }))}
              placeholder="Select a customer"
              emptyMessage="No customers found."
            />
            <div className="space-y-1">
              <Label htmlFor="job-assigned">Assigned To</Label>
              <Select value={formData.assignedToId} onValueChange={(value) => setFormData(prev => ({ ...prev, assignedToId: value }))}>
                <SelectTrigger id="job-assigned">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tracking */}
            <div className="space-y-3 pt-4 border-t">
              <Label>Tracking</Label>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="inQuickBooks"
                    checked={formData.inQuickBooks}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, inQuickBooks: checked as boolean }))}
                  />
                  <label htmlFor="inQuickBooks" className="text-sm text-gray-700 cursor-pointer">
                    In QuickBooks
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="inLDrive"
                    checked={formData.inLDrive}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, inLDrive: checked as boolean }))}
                  />
                  <label htmlFor="inLDrive" className="text-sm text-gray-700 cursor-pointer">
                    In L Drive
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap">File Link:</label>
                  <div className="w-64">
                    <Input
                      value={formData.fileLink || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, fileLink: e.target.value }))}
                      placeholder="L:\Customer\Job1234"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Enter the shared drive path (e.g., L:\Customer\Job1234)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
