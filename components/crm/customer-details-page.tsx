'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  CheckCircle2, AlertCircle, Calendar, ArrowLeft, MapPin
} from 'lucide-react'
import { QuoteFileViewer } from '@/components/crm/quote-file-viewer'
import { format, isAfter, subDays, differenceInDays } from 'date-fns'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Contact {
  id: string
  name: string
  email: string | null
  phone: string | null
  position: string | null
  createdAt: string
}

interface Quote {
  id: string
  quoteNumber: string
  title: string
  status: string
  isActive: boolean
  amount: number
  createdAt: string
  lastFollowUp: string | null
  quoteFile: string | null
  relatedJobId: string | null
}

interface Job {
  id: string
  jobNumber: string
  title: string
  status: string
  priority: string
  createdAt: string
  lastFollowUp: string | null
}

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  isActive: boolean
}

interface CustomerDetailsPageProps {
  customer: Customer
  initialContacts?: Contact[]
  initialQuotes?: Quote[]
  initialJobs?: Job[]
}

export function CustomerDetailsPage({ customer: initialCustomer, initialContacts = [], initialQuotes = [], initialJobs = [] }: CustomerDetailsPageProps) {
  const router = useRouter()
  const [customer, setCustomer] = useState<Customer>(initialCustomer)
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const [quotes, setQuotes] = useState<Quote[]>(initialQuotes)
  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', position: '' })
  const [loading, setLoading] = useState(false)

  // Check if follow-up is overdue (>7 days for weekly follow-ups)
  const isOverdue = (lastFollowUp: string | null) => {
    if (!lastFollowUp) return true
    const sevenDaysAgo = subDays(new Date(), 7)
    return isAfter(sevenDaysAgo, new Date(lastFollowUp))
  }

  // Get days since last follow-up
  const daysSinceFollowUp = (lastFollowUp: string | null) => {
    if (!lastFollowUp) return null
    return differenceInDays(new Date(), new Date(lastFollowUp))
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
            q.id === id ? { ...q, lastFollowUp: new Date().toISOString() } : q
          ))
        } else {
          setJobs(jobs.map(j => 
            j.id === id ? { ...j, lastFollowUp: new Date().toISOString() } : j
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

  // Quote refresh function
  const fetchQuotes = async () => {
    try {
      const response = await fetch(`/api/quotes?customerId=${customer.id}`)
      if (response.ok) {
        const data = await response.json()
        setQuotes(data.map((quote: any) => ({
          ...quote,
          createdAt: quote.createdAt,
          lastFollowUp: quote.lastFollowUp ? new Date(quote.lastFollowUp).toISOString() : null,
        })))
      }
    } catch (error) {
      console.error('Error fetching quotes:', error)
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-100 text-green-800'
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'REJECTED': return 'bg-red-100 text-red-800'
      case 'COMPLETED': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getJobStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800'
      case 'QUOTE': return 'bg-yellow-100 text-yellow-800'
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
    <div className="pt-4">
      {/* Tabs for Quotes and Jobs */}
      <Tabs defaultValue="quotes" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="quotes" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Quotes ({quotes.length})
          </TabsTrigger>
          <TabsTrigger value="jobs" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Jobs ({jobs.length})
          </TabsTrigger>
        </TabsList>

        {/* Quotes Tab */}
        <TabsContent value="quotes">
          <Card>
            <CardHeader>
              <CardTitle>Quotes</CardTitle>
            </CardHeader>
            <CardContent>
              {quotes.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No quotes found for this customer.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {quotes.map((quote) => {
                    // Show follow-up for QUOTE status quotes
                    const shouldShowFollowUp = quote.status === 'QUOTE' || quote.status === 'DRAFT'
                    const overdue = shouldShowFollowUp && isOverdue(quote.lastFollowUp)
                    const days = shouldShowFollowUp ? daysSinceFollowUp(quote.lastFollowUp) : null
                    
                    return (
                      <Link
                        key={quote.id}
                        href={quote.relatedJobId ? `/dashboard/jobs/${quote.relatedJobId}` : `/dashboard/customers/${customer.id}`}
                        className="block border rounded-lg p-5 bg-white hover:bg-gray-50 transition-colors shadow-sm cursor-pointer"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3">
                              <h4 className="font-semibold text-lg">{quote.quoteNumber} - {quote.title}</h4>
                              <Badge className={getStatusColor(quote.status)}>
                                {quote.status}
                              </Badge>
                              {!quote.isActive && (
                                <Badge variant="outline">Inactive</Badge>
                              )}
                              {shouldShowFollowUp && overdue && (
                                <Badge variant="destructive" className="flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  Overdue
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 space-y-1 ml-1">
                              <div className="font-medium text-gray-900">Amount: ${(quote.amount || 0).toFixed(2)}</div>
                              <div>Created: {format(new Date(quote.createdAt), 'MMM d, yyyy')}</div>
                              {shouldShowFollowUp && (
                                quote.lastFollowUp ? (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Last follow-up: {format(new Date(quote.lastFollowUp), 'MMM d, yyyy')}
                                    {days !== null && days > 0 && (
                                      <span className="text-gray-500">({days} days ago)</span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-orange-600 font-medium">
                                    <AlertCircle className="h-3 w-3" />
                                    Never followed up
                                  </div>
                                )
                              )}
                            </div>
                            {/* Quote File Upload/Viewer */}
                            <div className="mt-3">
                              <QuoteFileViewer
                                quoteId={quote.id}
                                quoteNumber={quote.quoteNumber}
                                quoteFile={quote.quoteFile}
                                onFileUploaded={() => {
                                  // Refresh quotes after file upload
                                  fetchQuotes()
                                }}
                              />
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            {shouldShowFollowUp && (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  markFollowUp('quote', quote.id)
                                }}
                                variant={overdue ? 'default' : 'outline'}
                                className="ml-4 flex-shrink-0"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Mark Followed Up
                              </Button>
                            )}
                          </div>
                        </div>
                      </Link>
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
                <div className="text-center py-12 text-gray-500">
                  <Briefcase className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No jobs found for this customer.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {jobs.map((job) => {
                    // Only show follow-up for ACTIVE status jobs
                    const shouldShowFollowUp = job.status === 'ACTIVE'
                    const overdue = shouldShowFollowUp && isOverdue(job.lastFollowUp)
                    const days = shouldShowFollowUp ? daysSinceFollowUp(job.lastFollowUp) : null
                    
                    return (
                      <div
                        key={job.id}
                        className="border rounded-lg p-5 bg-white hover:bg-gray-50 transition-colors shadow-sm cursor-pointer"
                        onClick={() => router.push(`/dashboard/jobs/${job.id}`)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3">
                              <h4 className="font-semibold text-lg">{job.jobNumber} - {job.title}</h4>
                              <Badge className={getJobStatusColor(job.status)}>
                                {job.status}
                              </Badge>
                              <Badge className={getPriorityColor(job.priority)}>
                                {job.priority}
                              </Badge>
                              {shouldShowFollowUp && overdue && (
                                <Badge variant="destructive" className="flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  Overdue
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 space-y-1 ml-1">
                              <div>Created: {format(new Date(job.createdAt), 'MMM d, yyyy')}</div>
                              {shouldShowFollowUp && (
                                job.lastFollowUp ? (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Last follow-up: {format(new Date(job.lastFollowUp), 'MMM d, yyyy')}
                                    {days !== null && days > 0 && (
                                      <span className="text-gray-500">({days} days ago)</span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-orange-600 font-medium">
                                    <AlertCircle className="h-3 w-3" />
                                    Never followed up
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                          {shouldShowFollowUp && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                markFollowUp('job', job.id)
                              }}
                              variant={overdue ? 'default' : 'outline'}
                              className="ml-4 flex-shrink-0"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Mark Followed Up
                            </Button>
                          )}
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
        <DialogContent className="sm:max-w-[500px]">
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
                className="mt-1"
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
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="contact-phone">Phone</Label>
              <Input
                id="contact-phone"
                value={contactForm.phone}
                onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                placeholder="Phone number"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="contact-position">Position</Label>
              <Input
                id="contact-position"
                value={contactForm.position}
                onChange={(e) => setContactForm({ ...contactForm, position: e.target.value })}
                placeholder="Job title or position"
                className="mt-1"
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

