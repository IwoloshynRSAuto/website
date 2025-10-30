'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Building2, Mail, Phone, MapPin, Folder, Edit, Save, X, Calendar, Clock, DollarSign, User } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  isActive: boolean
  fileLink: string | null
  createdAt: Date
  updatedAt: Date
  jobs: Array<{
    id: string
    jobNumber: string
    title: string
    status: string
    priority: string
    startDate: Date | null
    endDate: Date | null
    estimatedCost: number | null
    createdAt: Date
    updatedAt: Date
    assignedTo: {
      name: string | null
    } | null
  }>
  _count: {
    jobs: number
  }
}

interface CustomerDetailsEditableProps {
  customer: Customer
}

export function CustomerDetailsEditable({ customer }: CustomerDetailsEditableProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: customer.name,
    email: customer.email || '',
    phone: customer.phone || '',
    isActive: customer.isActive,
    fileLink: customer.fileLink || '',
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, isActive: checked }))
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          isActive: formData.isActive,
          fileLink: formData.fileLink || null,
        }),
      })

      if (response.ok) {
        toast.success('Customer updated successfully')
        setIsEditing(false)
        router.refresh()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update customer')
      }
    } catch (error) {
      console.error('Error updating customer:', error)
      toast.error('An error occurred while updating the customer')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      isActive: customer.isActive,
      fileLink: customer.fileLink || '',
    })
    setIsEditing(false)
  }

  const openInFileExplorer = async (filePath: string | null): Promise<void> => {
    if (!filePath) {
      toast.error('No file path available')
      return
    }
    
    try {
      const response = await fetch('/api/open-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filePath }),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast.success('Opening folder in File Explorer...')
      } else {
        console.error('Failed to open folder:', data.error)
        
        try {
          await navigator.clipboard.writeText(filePath)
          toast.success(`Path copied to clipboard: ${filePath}`)
        } catch (clipboardError) {
          toast.error(`Failed to open folder. Path: ${filePath}`)
        }
      }
    } catch (error) {
      console.error('Error opening folder:', error)
      toast.error('Failed to open folder')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800'
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800'
      case 'QUOTE':
        return 'bg-yellow-100 text-yellow-800'
      case 'Open':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW':
        return 'bg-gray-100 text-gray-800'
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-800'
      case 'HIGH':
        return 'bg-orange-100 text-orange-800'
      case 'URGENT':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="bg-blue-100 p-3 rounded-lg">
            <Building2 className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{customer.name}</h1>
            <p className="text-gray-600">Customer Details</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isEditing ? (
            <>
              <Button
                onClick={handleSave}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                onClick={handleCancel}
                variant="outline"
                disabled={isLoading}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setIsEditing(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Customer
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="h-5 w-5 mr-2" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Customer Name</Label>
                {isEditing ? (
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="mt-1"
                  />
                ) : (
                  <div className="mt-1 text-lg font-medium">{customer.name}</div>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                {isEditing ? (
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="mt-1"
                    placeholder="customer@example.com"
                  />
                ) : (
                  <div className="mt-1 flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-gray-400" />
                    {customer.email || 'No email provided'}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="phone">Phone</Label>
                {isEditing ? (
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="mt-1"
                    placeholder="(555) 123-4567"
                  />
                ) : (
                  <div className="mt-1 flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-gray-400" />
                    {customer.phone || 'No phone provided'}
                  </div>
                )}
              </div>


              {/* File Link Field */}
              <div>
                <Label htmlFor="fileLink">File Link</Label>
                {isEditing ? (
                  <div className="mt-1">
                    <Input
                      id="fileLink"
                      name="fileLink"
                      value={formData.fileLink}
                      onChange={handleInputChange}
                      placeholder="L:\Customers\CustomerName"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter the shared drive path (e.g., L:\Customers\CustomerName)
                    </p>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center">
                    <Folder className="h-4 w-4 mr-2 text-gray-400" />
                    {customer.fileLink ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                        onClick={() => openInFileExplorer(customer.fileLink)}
                      >
                        <Folder className="h-3 w-3 mr-1" />
                        Open Folder
                      </Button>
                    ) : (
                      <span className="text-gray-500">No file link set</span>
                    )}
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={handleCheckboxChange}
                  disabled={!isEditing}
                />
                <Label 
                  htmlFor="isActive" 
                  className={`text-sm ${!isEditing ? 'text-gray-500' : 'text-gray-700 cursor-pointer'}`}
                >
                  Active Customer
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Customer Jobs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Building2 className="h-5 w-5 mr-2" />
                  Customer Jobs ({customer._count.jobs})
                </span>
                <Badge variant={customer.isActive ? 'default' : 'secondary'}>
                  {customer.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customer.jobs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No jobs found for this customer</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {customer.jobs.map((job) => (
                    <div
                      key={job.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/dashboard/jobs/${job.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="font-medium text-sm">{job.jobNumber}</span>
                            <Badge className={`text-xs ${getStatusColor(job.status)}`}>
                              {job.status}
                            </Badge>
                            <Badge className={`text-xs ${getPriorityColor(job.priority)}`}>
                              {job.priority}
                            </Badge>
                          </div>
                          <h4 className="font-medium text-gray-900 mb-1">{job.title}</h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            {job.assignedTo && (
                              <div className="flex items-center">
                                <User className="h-3 w-3 mr-1" />
                                {job.assignedTo.name}
                              </div>
                            )}
                            {job.estimatedCost && (
                              <div className="flex items-center">
                                <DollarSign className="h-3 w-3 mr-1" />
                                ${job.estimatedCost.toLocaleString()}
                              </div>
                            )}
                            {job.startDate && (
                              <div className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {format(new Date(job.startDate), 'MMM dd, yyyy')}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {format(new Date(job.updatedAt), 'MMM dd, yyyy')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Jobs</span>
                <span className="font-semibold text-lg">{customer._count.jobs}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Status</span>
                <Badge variant={customer.isActive ? 'default' : 'secondary'}>
                  {customer.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Created</span>
                <span className="text-sm">{format(new Date(customer.createdAt), 'MMM dd, yyyy')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Last Updated</span>
                <span className="text-sm">{format(new Date(customer.updatedAt), 'MMM dd, yyyy')}</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push('/dashboard/jobs')}
              >
                <Building2 className="h-4 w-4 mr-2" />
                View All Jobs
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push('/dashboard/customers')}
              >
                <Building2 className="h-4 w-4 mr-2" />
                Back to Customers
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
