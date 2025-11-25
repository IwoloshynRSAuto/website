'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { ArrowLeft, Calendar, User, Building, DollarSign, FileText, Save, X, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'

interface Quote {
  id: string
  quoteNumber: string
  title: string
  description: string | null
  amount: number
  status: string
  validUntil: Date | null
  customerId: string | null
  assignedToId: string | null
  customerContactName: string | null
  customerContactEmail: string | null
  customerContactPhone: string | null
  paymentTerms: string | null
  quoteFile: string | null
  createdAt: Date
  updatedAt: Date
  assignedTo: {
    id: string
    name: string | null
  } | null
  customer: {
    id: string
    name: string
    email: string | null
    phone: string | null
  } | null
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
}

interface QuoteDetailsEditableProps {
  quote: Quote
  users: User[]
  customers: Customer[]
}

export function QuoteDetailsEditable({ quote, users, customers }: QuoteDetailsEditableProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(true)
  const [formData, setFormData] = useState({
    title: quote.title,
    description: quote.description || '',
    status: quote.status,
    amount: quote.amount.toString(),
    validUntil: quote.validUntil ? format(new Date(quote.validUntil), 'yyyy-MM-dd') : '',
    assignedToId: quote.assignedToId || 'unassigned',
    customerId: quote.customerId || 'no-customer',
    customerContactName: quote.customerContactName || '',
    customerContactEmail: quote.customerContactEmail || '',
    customerContactPhone: quote.customerContactPhone || '',
    paymentTerms: quote.paymentTerms || '',
    quoteFile: quote.quoteFile || '',
  })

  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/quotes/${quote.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          status: formData.status,
          amount: parseFloat(formData.amount) || 0,
          validUntil: formData.validUntil ? new Date(formData.validUntil + 'T12:00:00').toISOString() : null,
          assignedToId: formData.assignedToId === 'unassigned' ? null : formData.assignedToId,
          customerId: formData.customerId === 'no-customer' ? null : formData.customerId,
          customerContactName: formData.customerContactName || null,
          customerContactEmail: formData.customerContactEmail || null,
          customerContactPhone: formData.customerContactPhone || null,
          paymentTerms: formData.paymentTerms || null,
          quoteFile: formData.quoteFile || null,
        }),
      })

      if (response.ok) {
        toast.success('Quote updated successfully')
        window.location.reload()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to update quote')
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to update quote')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      title: quote.title,
      description: quote.description || '',
      status: quote.status,
      amount: quote.amount.toString(),
      validUntil: quote.validUntil ? format(new Date(quote.validUntil), 'yyyy-MM-dd') : '',
      assignedToId: quote.assignedToId || 'unassigned',
      customerId: quote.customerId || 'no-customer',
      customerContactName: quote.customerContactName || '',
      customerContactEmail: quote.customerContactEmail || '',
      customerContactPhone: quote.customerContactPhone || '',
      paymentTerms: quote.paymentTerms || '',
      quoteFile: quote.quoteFile || '',
    })
    setIsEditing(false)
  }

  const handleConvertToJob = async () => {
    if (!confirm('Convert this quote to an active job?')) {
      return
    }
    setIsLoading(true)
    try {
      const response = await fetch(`/api/quotes/${quote.id}/convertToJob`, { method: 'POST' })
      if (response.ok) {
        const result = await response.json()
        toast.success(`Quote converted to job ${result.job.jobNumber}`)
        window.location.href = `/dashboard/jobs/${result.job.id}`
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to convert quote')
      }
    } catch (error) {
      console.error('Convert error:', error)
      toast.error('Failed to convert quote')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this quote? This action cannot be undone.')) {
      return
    }
    setIsLoading(true)
    try {
      const response = await fetch(`/api/quotes/${quote.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Quote deleted successfully')
        router.push('/dashboard/jobs?tab=quotes')
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to delete quote')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete quote')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-200 text-gray-800',
      SENT: 'bg-blue-200 text-blue-800',
      APPROVED: 'bg-green-200 text-green-800',
      WON: 'bg-green-600 text-white',
      LOST: 'bg-red-200 text-red-800',
      CANCELLED: 'bg-gray-400 text-white',
    }
    return colors[status] || 'bg-gray-200 text-gray-800'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/jobs?tab=quotes">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{quote.title}</h1>
            <p className="text-sm text-gray-600">Quote {quote.quoteNumber} • Created {format(new Date(quote.createdAt), 'MMM d, yyyy')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button onClick={handleSave} disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              Edit Quote
            </Button>
          )}
          <Button onClick={handleConvertToJob} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
            Convert to Job
          </Button>
          <Button 
            onClick={handleDelete} 
            disabled={isLoading} 
            variant="destructive"
            className="bg-red-600 hover:bg-red-700"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quote Title
              </label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                disabled={!isEditing}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={!isEditing}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="SENT">Sent</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="WON">Won</SelectItem>
                    <SelectItem value="LOST">Lost</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valid Until
                </label>
                <Input
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  disabled={!isEditing}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Terms
                </label>
                <Input
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                  disabled={!isEditing}
                  placeholder="e.g., Net 30"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column - Team & Customer */}
        <Card>
          <CardHeader>
            <CardTitle>Team & Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer
              </label>
              <SearchableSelect
                options={[
                  { value: 'no-customer', label: 'No Customer' },
                  ...customers.map(c => ({ value: c.id, label: c.name }))
                ]}
                value={formData.customerId}
                onValueChange={(value: string) => setFormData({ ...formData, customerId: value })}
                disabled={!isEditing}
                placeholder="Select customer..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assigned To
              </label>
              <SearchableSelect
                options={[
                  { value: 'unassigned', label: 'Unassigned' },
                  ...users.map(u => ({ value: u.id, label: u.name || u.email }))
                ]}
                value={formData.assignedToId}
                onValueChange={(value: string) => setFormData({ ...formData, assignedToId: value })}
                disabled={!isEditing}
                placeholder="Select assignee..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Contact
              </label>
              <Input
                value={formData.customerContactName}
                onChange={(e) => setFormData({ ...formData, customerContactName: e.target.value })}
                disabled={!isEditing}
                placeholder="Contact name"
              />
            </div>

            {/* Tracking Section - matches Job layout */}
            <div className="space-y-3 pt-4 border-t">
              <label className="text-sm font-medium text-gray-700">File Link</label>
              <Input
                value={formData.quoteFile}
                onChange={(e) => setFormData({ ...formData, quoteFile: e.target.value })}
                disabled={!isEditing}
                placeholder="L:\Customer\Quote1234"
              />
              <p className="text-xs text-gray-500">
                Enter the shared drive path (e.g., L:\Customer\Quote1234)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

