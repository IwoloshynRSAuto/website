'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ArrowLeft, Save, X, Building2, Mail, Phone, MapPin, Folder, Users, Plus, Edit, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  isActive: boolean
  fileLink: string | null
}

interface Contact {
  id: string
  name: string
  email: string | null
  phone: string | null
  position: string | null
}

interface CustomerDetailsEditableProps {
  customer: Customer
  contacts?: Contact[]
  contactsCount?: number
  activeQuotesCount?: number
  activeJobsCount?: number
  overdueFollowUpsCount?: number
}

export function CustomerDetailsEditable({ 
  customer: initialCustomer,
  contacts = [],
  contactsCount = 0,
  activeQuotesCount = 0,
  activeJobsCount = 0,
  overdueFollowUpsCount = 0,
}: CustomerDetailsEditableProps) {
  const router = useRouter()
  
  // Initialize state with customer data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    isActive: true,
    fileLink: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [contactsList, setContactsList] = useState<Contact[]>(contacts)
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false)
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', position: '' })

  // Initialize form data from props
  useEffect(() => {
    if (initialCustomer && !isInitialized) {
      setFormData({
        name: initialCustomer.name || '',
        email: initialCustomer.email || '',
        phone: initialCustomer.phone || '',
        address: initialCustomer.address || '',
        isActive: initialCustomer.isActive ?? true,
        fileLink: initialCustomer.fileLink || '',
      })
      setIsInitialized(true)
    }
  }, [initialCustomer, isInitialized])

  // Update contacts list when props change
  useEffect(() => {
    setContactsList(contacts)
  }, [contacts])

  // Show error if customer data is invalid
  if (!initialCustomer || !initialCustomer.id) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800">Error</h2>
          <p className="text-sm text-red-600">Customer data not available</p>
        </div>
      </div>
    )
  }

  const handleSave = async () => {
    // Validate name is not empty
    if (!formData.name || formData.name.trim() === '') {
      toast.error('Customer name is required')
      return
    }

    setIsLoading(true)
    try {
      // Build payload - validate email if provided
      const emailValue = formData.email?.trim() || ''
      if (emailValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
        toast.error('Please enter a valid email address or leave it empty')
        setIsLoading(false)
        return
      }

      const payload = {
        name: formData.name.trim(),
        email: emailValue || null,
        phone: formData.phone?.trim() || null,
        address: formData.address?.trim() || null,
        isActive: formData.isActive,
        fileLink: formData.fileLink?.trim() || null,
      }

      console.log('Saving customer with payload:', payload)

      const response = await fetch(`/api/customers/${initialCustomer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast.success('Customer updated successfully!')
        router.refresh()
      } else {
        console.error('[CustomerDetailsEditable] API Error:', data)
        const errorMessage = data.details 
          ? `Validation error: ${JSON.stringify(data.details)}` 
          : data.error || 'Failed to update customer'
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error('Error updating customer:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update customer'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      name: initialCustomer.name || '',
      email: initialCustomer.email || '',
      phone: initialCustomer.phone || '',
      address: initialCustomer.address || '',
      isActive: initialCustomer.isActive ?? true,
      fileLink: initialCustomer.fileLink || '',
    })
  }

  const openInFileExplorer = async (filePath: string | null | undefined) => {
    const path = filePath?.trim()
    if (!path) {
      toast.error('No file path available')
      return
    }
    
    try {
      console.log('[CustomerDetailsEditable] Opening folder:', path)
      const response = await fetch('/api/open-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filePath: path }),
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        toast.success('Opening folder in File Explorer...')
      } else {
        console.error('[CustomerDetailsEditable] Failed to open folder:', data)
        // If path doesn't exist or can't be opened, copy to clipboard as fallback
        try {
          await navigator.clipboard.writeText(path)
          toast.success(`Path copied to clipboard: ${path}`)
        } catch (clipboardError) {
          toast.error(data.error || `Failed to open folder. Path: ${path}`)
        }
      }
    } catch (error) {
      console.error('[CustomerDetailsEditable] Error opening folder:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to open folder'
      toast.error(errorMessage)
    }
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white border-b border-gray-200 shadow-sm">
      <div className="px-3 sm:px-4 lg:px-6 py-5 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <Link href="/dashboard/customers">
              <Button variant="outline" size="sm" className="shadow-sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Customers
              </Button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{initialCustomer.name || 'Customer'}</h1>
              <p className="text-sm sm:text-base text-gray-600">Edit Customer Information</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              onClick={handleSave} 
              disabled={isLoading} 
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleCancel} 
              disabled={isLoading}
              className="shadow-sm"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Badge 
              variant={formData.isActive ? 'default' : 'secondary'} 
              className="text-sm px-3 py-1.5 font-medium"
            >
              {formData.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Basic Information */}
          <Card className="border-2 border-gray-200 shadow-md">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Building2 className="h-5 w-5 text-blue-600" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
            <div>
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                Customer Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1.5 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                placeholder="ABC Company Inc."
                required
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="mt-1.5 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                placeholder="contact@example.com"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400" />
                Phone
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="mt-1.5 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <Label htmlFor="address" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                Address
              </Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                className="mt-1.5 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                placeholder="123 Main St, City, State ZIP"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="fileLink" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Folder className="h-4 w-4 text-gray-400" />
                File Link
              </Label>
              <div className="mt-1.5 flex items-center gap-2">
                <Input
                  id="fileLink"
                  value={formData.fileLink}
                  onChange={(e) => setFormData(prev => ({ ...prev, fileLink: e.target.value }))}
                  placeholder="L:\Customers\CustomerName or C:\Downloads"
                  className="flex-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openInFileExplorer(formData.fileLink)}
                  disabled={!formData.fileLink || formData.fileLink.trim() === ''}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  title={formData.fileLink ? `Open ${formData.fileLink}` : 'Enter a file path first'}
                >
                  <Folder className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1.5">
                Enter the shared drive path (e.g., L:\Customers\CustomerName) or local path
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked === true }))}
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Active Customer
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Contacts Card */}
        <Card className="border-2 border-gray-200 shadow-md">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Users className="h-5 w-5 text-blue-600" />
                Contacts ({contactsList.length})
              </CardTitle>
              <Button 
                onClick={() => setIsContactDialogOpen(true)} 
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {contactsList.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No contacts found</p>
                <Button 
                  onClick={() => setIsContactDialogOpen(true)} 
                  size="sm"
                  variant="outline"
                  className="mt-3"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Contact
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {contactsList.map((contact) => (
                  <div 
                    key={contact.id} 
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{contact.name}</p>
                      {contact.position && (
                        <p className="text-xs text-gray-500 mt-0.5">{contact.position}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                        {contact.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {contact.email}
                          </span>
                        )}
                        {contact.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {contact.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Edit contact"
                        onClick={async () => {
                          // TODO: Add edit functionality
                          toast.info('Edit functionality coming soon')
                        }}
                      >
                        <Edit className="h-3.5 w-3.5 text-gray-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        title="Delete contact"
                        onClick={async () => {
                          if (!confirm('Are you sure you want to delete this contact?')) return
                          try {
                            const response = await fetch(`/api/contacts/${contact.id}`, {
                              method: 'DELETE',
                            })
                            if (response.ok) {
                              setContactsList(contactsList.filter(c => c.id !== contact.id))
                              toast.success('Contact deleted')
                              router.refresh()
                            } else {
                              toast.error('Failed to delete contact')
                            }
                          } catch (error) {
                            toast.error('Failed to delete contact')
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Contact Dialog */}
      <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="contactName">Name *</Label>
              <Input
                id="contactName"
                value={contactForm.name}
                onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="John Doe"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="contactPosition">Position</Label>
              <Input
                id="contactPosition"
                value={contactForm.position}
                onChange={(e) => setContactForm(prev => ({ ...prev, position: e.target.value }))}
                placeholder="Manager"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="contactEmail">Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={contactForm.email}
                onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="john@example.com"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="contactPhone">Phone</Label>
              <Input
                id="contactPhone"
                type="tel"
                value={contactForm.phone}
                onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(555) 123-4567"
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsContactDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                if (!contactForm.name.trim()) {
                  toast.error('Contact name is required')
                  return
                }
                try {
                  // Build payload - validate email if provided
                  const emailValue = contactForm.email?.trim() || ''
                  if (emailValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
                    toast.error('Please enter a valid email address or leave it empty')
                    return
                  }

                  const payload = {
                    customerId: initialCustomer.id,
                    name: contactForm.name.trim(),
                    email: emailValue || null,
                    phone: contactForm.phone?.trim() || null,
                    position: contactForm.position?.trim() || null,
                  }

                  console.log('Creating contact with payload:', payload)

                  const response = await fetch(`/api/contacts`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                  })

                  if (response.ok) {
                    const newContact = await response.json()
                    setContactsList([...contactsList, newContact])
                    setContactForm({ name: '', email: '', phone: '', position: '' })
                    setIsContactDialogOpen(false)
                    toast.success('Contact added successfully')
                    router.refresh()
                  } else {
                    const errorData = await response.json()
                    console.error('API Error:', errorData)
                    const errorMessage = errorData.error 
                      ? (typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error))
                      : 'Failed to add contact'
                    toast.error(errorMessage)
                  }
                } catch (error) {
                  console.error('Error adding contact:', error)
                  const errorMessage = error instanceof Error ? error.message : 'Failed to add contact'
                  toast.error(errorMessage)
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Add Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  </div>
  )
}
