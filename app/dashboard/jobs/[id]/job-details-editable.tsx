'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { DeleteJobButton } from '@/components/jobs/delete-job-button'
import { QuoteFileViewerForJob } from '@/components/crm/quote-file-viewer-for-job'
import { ArrowLeft, Calendar, User, Building, DollarSign, FileText, Clock, Plus, Save, X } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import { toast } from 'react-hot-toast'

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
  const [isEditing, setIsEditing] = useState(true) // Always start in editing mode
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
        toast.success(`Quote converted to job ${newJob.jobNumber}`)
        window.location.href = `/dashboard/jobs/${newJob.id}`
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to convert quote')
      }
    } catch (error) {
      console.error('Upgrade error:', error)
      toast.error('Failed to convert quote')
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
        toast.success('Job updated successfully!')
        // No need to set isEditing to false since we're always in editing mode
        // Refresh the page to show updated data
        window.location.reload()
      } else {
        const errorData = await response.json()
        toast.error(`Failed to update job: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error updating job:', error)
      toast.error('Failed to update job')
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
    // No need to set isEditing to false since we're always in editing mode
  }


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'QUOTE': return 'bg-yellow-100 text-yellow-800'
      case 'ACTIVE': return 'bg-green-100 text-green-800'
      case 'COMPLETED': return 'bg-blue-100 text-blue-800'
      case 'ON_HOLD': return 'bg-orange-100 text-orange-800'
      case 'CANCELLED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'bg-green-100 text-green-800'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800'
      case 'HIGH': return 'bg-orange-100 text-orange-800'
      case 'URGENT': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-6">
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
            <div>
              <label className="text-sm font-medium text-gray-500">Job Title</label>
              {isEditing ? (
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="mt-1"
                />
              ) : (
                <input
                  type="text"
                  value={job.title}
                  readOnly
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Description</label>
              {isEditing ? (
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="mt-1"
                />
              ) : (
                <textarea
                  value={job.description || ''}
                  readOnly
                  rows={3}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                {isEditing ? (
                  <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger className="mt-1">
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
                ) : (
                  <select
                    value={job.status}
                    disabled
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  >
                    <option value="QUOTE">Quote</option>
                    <option value="ACTIVE">Active</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="ON_HOLD">On Hold</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Priority</label>
                {isEditing ? (
                  <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <select
                    value={job.priority}
                    disabled
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Start Date</label>
                <div className="mt-1 flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  {isEditing ? (
                    <Input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  ) : (
                    <input
                      type="text"
                      value={job.startDate ? format(new Date(job.startDate), 'MM/dd/yyyy') : ''}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    />
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">End Date</label>
                <div className="mt-1 flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  {isEditing ? (
                    <Input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  ) : (
                    <input
                      type="text"
                      value={job.endDate ? format(new Date(job.endDate), 'MM/dd/yyyy') : ''}
                      placeholder="mm/dd/yyyy"
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    />
                  )}
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
            <div>
              {isEditing ? (
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
              ) : (
                <div>
                  <label className="text-sm font-medium text-gray-500">Customer</label>
                  <input
                    type="text"
                    value={job.customer?.name || 'No Customer'}
                    readOnly
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Assigned To</label>
              {isEditing ? (
                <Select value={formData.assignedToId} onValueChange={(value) => setFormData(prev => ({ ...prev, assignedToId: value }))}>
                  <SelectTrigger className="mt-1">
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
              ) : (
                <select
                  value={job.assignedTo?.id || 'unassigned'}
                  disabled
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                >
                  <option value="unassigned">Unassigned</option>
                  {job.assignedTo && (
                    <option value={job.assignedTo.id}>{job.assignedTo.name || 'Unnamed User'}</option>
                  )}
                </select>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Customer Contact</label>
              <input
                type="text"
                value={job.assignedTo?.name || ''}
                readOnly
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              />
            </div>
            
            {/* QuickBooks and L Drive Status */}
            <div className="space-y-3 pt-4 border-t">
              <label className="text-sm font-medium text-gray-700">Tracking</label>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="inQuickBooks"
                    checked={formData.inQuickBooks}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, inQuickBooks: checked as boolean }))}
                    disabled={!isEditing}
                  />
                  <label 
                    htmlFor="inQuickBooks" 
                    className={`text-sm ${!isEditing ? 'text-gray-500' : 'text-gray-700 cursor-pointer'}`}
                  >
                    In QuickBooks
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="inLDrive"
                    checked={formData.inLDrive}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, inLDrive: checked as boolean }))}
                    disabled={!isEditing}
                  />
                  <label 
                    htmlFor="inLDrive" 
                    className={`text-sm ${!isEditing ? 'text-gray-500' : 'text-gray-700 cursor-pointer'}`}
                  >
                    In L Drive
                  </label>
                </div>
                
                {/* File Link Field - positioned to the right of L Drive */}
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap">File Link:</label>
                  <div className="w-64">
                    {isEditing ? (
                      <Input
                        value={formData.fileLink || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, fileLink: e.target.value }))}
                        placeholder="L:\Customer\Job1234"
                        className="w-full"
                      />
                    ) : (
                      <input
                        type="text"
                        value={formData.fileLink || ''}
                        readOnly
                        placeholder="No file link set"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                      />
                    )}
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Enter the shared drive path (e.g., L:\Customer\Job1234)
              </p>
              
              {/* Quote File Section - Show for quote-type jobs, integrated into Tracking section */}
              {job.type === 'QUOTE' && (
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Quote File</label>
                      <p className="text-xs text-gray-500">Upload PDF or Word documents for this quote</p>
                    </div>
                    <div className="flex-shrink-0">
                      <QuoteFileViewerForJob
                        jobId={job.id}
                        jobNumber={job.jobNumber}
                        existingQuote={job.quote ? {
                          id: job.quote.id,
                          quoteNumber: job.quote.quoteNumber,
                          quoteFile: job.quote.quoteFile,
                        } : null}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
