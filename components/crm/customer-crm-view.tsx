'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Building2, Mail, Phone, Users, FileText, Briefcase, Plus, Edit, Trash2,
  CheckCircle2, AlertCircle, Calendar
} from 'lucide-react'
import { format, isAfter, subDays, differenceInDays } from 'date-fns'
import { toast } from 'react-hot-toast'

interface Contact {
  id: string
  name: string
  email: string | null
  phone: string | null
  position: string | null
  createdAt: Date
}

interface Quote {
  id: string
  quoteNumber: string
  title: string
  status: string
  isActive: boolean
  amount: number
  createdAt: Date
  lastFollowUp: Date | null
}

interface Job {
  id: string
  jobNumber: string
  title: string
  status: string
  priority: string
  createdAt: Date
  lastFollowUp: Date | null
}

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  isActive: boolean
}

interface CustomerCrmViewProps {
  customer: Customer
  initialContacts?: Contact[]
  initialQuotes?: Quote[]
  initialJobs?: Job[]
}

export function CustomerCrmView({ customer, initialContacts = [], initialQuotes = [], initialJobs = [] }: CustomerCrmViewProps) {
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const [quotes, setQuotes] = useState<Quote[]>(initialQuotes)
  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', position: '' })
  const [loading, setLoading] = useState(false)

  // Check if follow-up is overdue (>30 days)
  const isOverdue = (lastFollowUp: Date | null) => {
    if (!lastFollowUp) return true
    const thirtyDaysAgo = subDays(new Date(), 30)
    return isAfter(thirtyDaysAgo, lastFollowUp)
  }

  // Get days since last follow-up
  const daysSinceFollowUp = (lastFollowUp: Date | null) => {
    if (!lastFollowUp) return null
    return differenceInDays(new Date(), lastFollowUp)
  }

  // Mark follow-up as completed
  const markFollowUp = async (type: 'quote' | 'job', id: string) => {
    try {
      const response = await fetch('/api/follow-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id }),
      })

      if (response.ok) {
        toast.success('Follow-up marked as completed')
        router.refresh()
        
        // Update local state
        if (type === 'quote') {
          setQuotes(quotes.map(q => 
            q.id === id ? { ...q, lastFollowUp: new Date() } : q
          ))
        } else {
          setJobs(jobs.map(j => 
            j.id === id ? { ...j, lastFollowUp: new Date() } : j
          ))
        }
      } else {
        toast.error('Failed to mark follow-up')
      }
    } catch (error) {
      console.error('Error marking follow-up:', error)
      toast.error('An error occurred')
    }
  }

  // Contact CRUD operations
  const fetchContacts = async () => {
    try {
      const response = await fetch(`/api/contacts?customerId=${customer.id}`)
      if (response.ok) {
        const data = await response.json()
        setContacts(data)
      }
    } catch (error) {
      console.error('Error fetching contacts:', error)
    }
  }

  const handleSaveContact = async () => {
    setLoading(true)
    try {
      const url = editingContact 
        ? `/api/contacts/${editingContact.id}`
        : '/api/contacts'
      const method = editingContact ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customer.id,
          ...contactForm,
        }),
      })

      if (response.ok) {
        toast.success(editingContact ? 'Contact updated' : 'Contact created')
        setIsContactDialogOpen(false)
        setEditingContact(null)
        setContactForm({ name: '', email: '', phone: '', position: '' })
        fetchContacts()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to save contact')
      }
    } catch (error) {
      console.error('Error saving contact:', error)
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return

    try {
      const response = await fetch(`/api/contacts/${contactId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Contact deleted')
        fetchContacts()
      } else {
        toast.error('Failed to delete contact')
      }
    } catch (error) {
      console.error('Error deleting contact:', error)
      toast.error('An error occurred')
    }
  }

  const openEditContact = (contact: Contact) => {
    setEditingContact(contact)
    setContactForm({
      name: contact.name,
      email: contact.email || '',
      phone: contact.phone || '',
      position: contact.position || '',
    })
    setIsContactDialogOpen(true)
  }

  const openNewContact = () => {
    setEditingContact(null)
    setContactForm({ name: '', email: '', phone: '', position: '' })
    setIsContactDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Customer Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-6 w-6" />
                {customer.name}
              </CardTitle>
              <CardDescription className="mt-2">
                Customer Relationship Management
              </CardDescription>
            </div>
            <Badge variant={customer.isActive ? 'default' : 'secondary'}>
              {customer.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {customer.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-gray-400" />
                <span>{customer.email}</span>
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-gray-400" />
                <span>{customer.phone}</span>
              </div>
            )}
            {customer.address && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-gray-400" />
                <span>{customer.address}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Contacts, Quotes, Jobs */}
      <Tabs defaultValue="contacts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="contacts">
            <Users className="h-4 w-4 mr-2" />
            Contacts ({contacts.length})
          </TabsTrigger>
          <TabsTrigger value="quotes">
            <FileText className="h-4 w-4 mr-2" />
            Quotes ({quotes.length})
          </TabsTrigger>
          <TabsTrigger value="jobs">
            <Briefcase className="h-4 w-4 mr-2" />
            Jobs ({jobs.length})
          </TabsTrigger>
        </TabsList>

        {/* Contacts Tab */}
        <TabsContent value="contacts">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Contacts</CardTitle>
                <Button onClick={openNewContact} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {contacts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No contacts found. Add your first contact to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">{contact.name}</TableCell>
                        <TableCell>{contact.position || '-'}</TableCell>
                        <TableCell>{contact.email || '-'}</TableCell>
                        <TableCell>{contact.phone || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditContact(contact)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteContact(contact.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quotes Tab */}
        <TabsContent value="quotes">
          <Card>
            <CardHeader>
              <CardTitle>Quotes</CardTitle>
            </CardHeader>
            <CardContent>
              {quotes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No quotes found for this customer.
                </div>
              ) : (
                <div className="space-y-4">
                  {quotes.map((quote) => {
                    const overdue = isOverdue(quote.lastFollowUp)
                    const days = daysSinceFollowUp(quote.lastFollowUp)
                    
                    return (
                      <div
                        key={quote.id}
                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{quote.quoteNumber} - {quote.title}</h4>
                              <Badge variant={quote.status === 'APPROVED' ? 'default' : 'secondary'}>
                                {quote.status}
                              </Badge>
                              {!quote.isActive && (
                                <Badge variant="outline">Inactive</Badge>
                              )}
                              {overdue && (
                                <Badge variant="destructive" className="flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  Overdue
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <div>Amount: ${quote.amount.toFixed(2)}</div>
                              <div>Created: {format(new Date(quote.createdAt), 'MMM d, yyyy')}</div>
                              {quote.lastFollowUp ? (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Last follow-up: {format(new Date(quote.lastFollowUp), 'MMM d, yyyy')}
                                  {days !== null && days > 0 && (
                                    <span className="text-gray-500">({days} days ago)</span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-orange-600">
                                  <AlertCircle className="h-3 w-3" />
                                  Never followed up
                                </div>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => markFollowUp('quote', quote.id)}
                            variant={overdue ? 'default' : 'outline'}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Mark Followed Up
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Jobs Tab */}
        <TabsContent value="jobs">
          <Card>
            <CardHeader>
              <CardTitle>Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              {jobs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No jobs found for this customer.
                </div>
              ) : (
                <div className="space-y-4">
                  {jobs.map((job) => {
                    const overdue = isOverdue(job.lastFollowUp)
                    const days = daysSinceFollowUp(job.lastFollowUp)
                    
                    return (
                      <div
                        key={job.id}
                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{job.jobNumber} - {job.title}</h4>
                              <Badge variant={job.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                {job.status}
                              </Badge>
                              <Badge variant="outline">{job.priority}</Badge>
                              {overdue && (
                                <Badge variant="destructive" className="flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  Overdue
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <div>Created: {format(new Date(job.createdAt), 'MMM d, yyyy')}</div>
                              {job.lastFollowUp ? (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Last follow-up: {format(new Date(job.lastFollowUp), 'MMM d, yyyy')}
                                  {days !== null && days > 0 && (
                                    <span className="text-gray-500">({days} days ago)</span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-orange-600">
                                  <AlertCircle className="h-3 w-3" />
                                  Never followed up
                                </div>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => markFollowUp('job', job.id)}
                            variant={overdue ? 'default' : 'outline'}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Mark Followed Up
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Contact Dialog */}
      <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingContact ? 'Edit Contact' : 'Add New Contact'}
            </DialogTitle>
            <DialogDescription>
              {editingContact 
                ? 'Update contact information' 
                : 'Add a new contact for this customer'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="contact-name">Name *</Label>
              <Input
                id="contact-name"
                value={contactForm.name}
                onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                placeholder="Contact name"
              />
            </div>
            <div>
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                value={contactForm.email}
                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                placeholder="contact@example.com"
              />
            </div>
            <div>
              <Label htmlFor="contact-phone">Phone</Label>
              <Input
                id="contact-phone"
                value={contactForm.phone}
                onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                placeholder="Phone number"
              />
            </div>
            <div>
              <Label htmlFor="contact-position">Position</Label>
              <Input
                id="contact-position"
                value={contactForm.position}
                onChange={(e) => setContactForm({ ...contactForm, position: e.target.value })}
                placeholder="Job title or position"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsContactDialogOpen(false)
                setEditingContact(null)
                setContactForm({ name: '', email: '', phone: '', position: '' })
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveContact} disabled={loading || !contactForm.name}>
              {loading ? 'Saving...' : editingContact ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

