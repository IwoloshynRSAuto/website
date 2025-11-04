'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const FORM_STORAGE_KEY = 'create-job-dialog-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { toast } from 'react-hot-toast'
import { FileText, Briefcase } from 'lucide-react'

interface Customer {
  id: string
  name: string
}

interface Quote {
  id: string
  quoteNumber: string
  title: string
  amount: number
  customer: {
    name: string
  }
}

interface CreateJobDialogProps {
  isOpen: boolean
  onClose: () => void
  selectedQuote?: Quote | null
}

export function CreateJobDialog({ isOpen, onClose, selectedQuote }: CreateJobDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [recordType, setRecordType] = useState<'QUOTE' | 'JOB'>('QUOTE')
  
  // Load initial form data from localStorage
  const loadFormData = () => {
    if (typeof window === 'undefined') {
      return {
        jobNumber: '',
        title: '',
        description: '',
        customerId: '',
        quoteId: '',
        status: 'PLANNING',
        priority: 'MEDIUM',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        quotedAmount: '',
        assignedTo: '',
        fileLink: ''
      }
    }
    
    try {
      const stored = localStorage.getItem(FORM_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return {
          jobNumber: parsed.jobNumber || '',
          title: parsed.title || '',
          description: parsed.description || '',
          customerId: parsed.customerId || '',
          quoteId: parsed.quoteId || '',
          status: parsed.status || 'PLANNING',
          priority: parsed.priority || 'MEDIUM',
          startDate: parsed.startDate || new Date().toISOString().split('T')[0],
          endDate: parsed.endDate || '',
          quotedAmount: parsed.quotedAmount || '',
          assignedTo: parsed.assignedTo || '',
          fileLink: parsed.fileLink || ''
        }
      }
    } catch (e) {
      console.error('[CreateJobDialog] Error loading form data:', e)
    }
    
    return {
      jobNumber: '',
      title: '',
      description: '',
      customerId: '',
      quoteId: '',
      status: 'PLANNING',
      priority: 'MEDIUM',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      quotedAmount: '',
      assignedTo: '',
      fileLink: ''
    }
  }
  
  const initialData = loadFormData()
  const [formData, setFormData] = useState(initialData)
  const isInitialMount = useRef(true)
  const skipNextSave = useRef(false)

  // Load form data from localStorage when dialog opens
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(FORM_STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          setFormData({
            jobNumber: parsed.jobNumber || '',
            title: parsed.title || '',
            description: parsed.description || '',
            customerId: parsed.customerId || '',
            quoteId: parsed.quoteId || '',
            status: parsed.status || 'PLANNING',
            priority: parsed.priority || 'MEDIUM',
            startDate: parsed.startDate || new Date().toISOString().split('T')[0],
            endDate: parsed.endDate || '',
            quotedAmount: parsed.quotedAmount || '',
            assignedTo: parsed.assignedTo || '',
            fileLink: parsed.fileLink || ''
          })
          setRecordType(parsed.recordType || 'QUOTE')
          skipNextSave.current = true
          console.log('[CreateJobDialog] ✅ Restored form data from localStorage')
        }
        fetchCustomers()
        fetchQuotes()
        generateJobNumber(recordType)
        if (selectedQuote) {
          setFormData(prev => ({
            ...prev,
            title: selectedQuote.title,
            customerId: '', // Will be set when we find the customer
            quoteId: selectedQuote.id,
            quotedAmount: selectedQuote.amount.toString()
          }))
        }
      } catch (e) {
        console.error('[CreateJobDialog] ❌ Error loading form data:', e)
      }
    }
  }, [isOpen, selectedQuote])

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }
    
    if (isOpen && typeof window !== 'undefined') {
      try {
        const dataToSave = {
          ...formData,
          recordType,
        }
        localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(dataToSave))
        console.log('[CreateJobDialog] 💾 Auto-saved form data to localStorage')
      } catch (e) {
        console.error('[CreateJobDialog] Error saving form data:', e)
      }
    }
  }, [formData, recordType, isOpen])

  // Auto-generate job number when type changes
  useEffect(() => {
    if (isOpen) {
      generateJobNumber(recordType)
    }
  }, [recordType, isOpen])

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers')
      if (response.ok) {
        const data = await response.json()
        setCustomers(data)
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error)
    }
  }

  const fetchQuotes = async () => {
    try {
      const response = await fetch('/api/quotes')
      if (response.ok) {
        const data = await response.json()
        setQuotes(data)
      }
    } catch (error) {
      console.error('Failed to fetch quotes:', error)
    }
  }

  const generateJobNumber = async (type: 'QUOTE' | 'JOB') => {
    try {
      const response = await fetch('/api/jobs')
      if (response.ok) {
        const jobs = await response.json()
        const prefix = type === 'QUOTE' ? 'Q' : 'E'
        
        // Filter jobs by type prefix
        const sameTypeJobs = jobs.filter((job: any) => 
          job.jobNumber.startsWith(prefix)
        )
        
        if (sameTypeJobs.length === 0) {
          setFormData(prev => ({ ...prev, jobNumber: `${prefix}1001` }))
        } else {
          // Extract numbers and find the highest
          const numbers = sameTypeJobs.map((job: any) => {
            const num = parseInt(job.jobNumber.substring(1))
            return isNaN(num) ? 0 : num
          })
          const maxNumber = Math.max(...numbers)
          const nextNumber = maxNumber + 1
          setFormData(prev => ({ ...prev, jobNumber: `${prefix}${nextNumber}` }))
        }
      }
    } catch (error) {
      console.error('Failed to generate job number:', error)
      const prefix = type === 'QUOTE' ? 'Q' : 'E'
      setFormData(prev => ({ ...prev, jobNumber: `${prefix}1001` }))
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Auto-generate job number if the field is cleared
    if (name === 'jobNumber' && !value.trim()) {
      generateJobNumber(recordType)
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleQuoteSelect = (quoteId: string) => {
    const selectedQuote = quotes.find(q => q.id === quoteId)
    if (selectedQuote) {
      setFormData(prev => ({
        ...prev,
        quoteId: selectedQuote.id,
        title: selectedQuote.title,
        quotedAmount: selectedQuote.amount.toString()
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Convert date strings to ISO format with time set to noon to avoid timezone issues
      const startDateISO = formData.startDate ? new Date(formData.startDate + 'T12:00:00').toISOString() : null
      const endDateISO = formData.endDate ? new Date(formData.endDate + 'T12:00:00').toISOString() : null

      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: recordType,
          jobNumber: formData.jobNumber.trim() || null,
          title: formData.title,
          description: formData.description || null,
          customerId: formData.customerId,
          quoteId: formData.quoteId || null,
          status: formData.status,
          priority: formData.priority,
          startDate: startDateISO,
          endDate: endDateISO,
          quotedAmount: parseFloat(formData.quotedAmount) || 0,
          assignedToId: formData.assignedTo || null,
          fileLink: formData.fileLink || null
        }),
      })

      if (response.ok) {
        toast.success(`${recordType === 'QUOTE' ? 'Quote' : 'Job'} created successfully`)
        
        // Clear localStorage after successful creation
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem(FORM_STORAGE_KEY)
            console.log('[CreateJobDialog] ✅ Cleared form data after successful job/quote creation')
          } catch (e) {
            console.error('[CreateJobDialog] Error clearing form data:', e)
          }
        }
        
        // Reset form state
        setFormData({
          jobNumber: '',
          title: '',
          description: '',
          customerId: '',
          quoteId: '',
          status: 'PLANNING',
          priority: 'MEDIUM',
          startDate: new Date().toISOString().split('T')[0],
          endDate: '',
          quotedAmount: '',
          assignedTo: '',
          fileLink: ''
        })
        setRecordType('QUOTE')
        
        onClose()
        router.refresh()
      } else {
        const errorData = await response.json()
        toast.error(`Failed to create ${recordType.toLowerCase()}: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Job / Quote</DialogTitle>
          <DialogDescription>
            {selectedQuote ? 
              `Create a job from quote ${selectedQuote.quoteNumber}` : 
              'Select the type and fill in the details below.'
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          {/* Type Selector */}
          <div className="mb-2">
            <Label className="text-base font-semibold mb-3 block">Record Type</Label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRecordType('QUOTE')}
                className={`p-4 border-2 rounded-lg transition-all ${
                  recordType === 'QUOTE'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-center mb-2">
                  <FileText className={`h-6 w-6 ${recordType === 'QUOTE' ? 'text-blue-500' : 'text-gray-400'}`} />
                </div>
                <div className="text-center">
                  <div className={`font-semibold ${recordType === 'QUOTE' ? 'text-blue-700' : 'text-gray-700'}`}>
                    Quote
                  </div>
                  <div className="text-xs text-gray-500 mt-1">ID starts with Q</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setRecordType('JOB')}
                className={`p-4 border-2 rounded-lg transition-all ${
                  recordType === 'JOB'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-center mb-2">
                  <Briefcase className={`h-6 w-6 ${recordType === 'JOB' ? 'text-green-500' : 'text-gray-400'}`} />
                </div>
                <div className="text-center">
                  <div className={`font-semibold ${recordType === 'JOB' ? 'text-green-700' : 'text-gray-700'}`}>
                    Job
                  </div>
                  <div className="text-xs text-gray-500 mt-1">ID starts with E</div>
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="jobNumber">Job Number</Label>
              <Input
                id="jobNumber"
                name="jobNumber"
                value={formData.jobNumber}
                onChange={handleInputChange}
                placeholder="Auto-generated if left empty"
              />
            </div>
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                placeholder="e.g., Conveyor System Installation"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="fileLink">File Link</Label>
            <Input
              id="fileLink"
              name="fileLink"
              value={formData.fileLink}
              onChange={handleInputChange}
              placeholder="L:\Projects\Job123 or file:///L:/Projects/Job123"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the shared drive path (e.g., L:\Projects\Job123) or file:// URL
            </p>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Optional detailed description of the job"
            />
          </div>

          <div>
            <SearchableSelect
              label="Customer"
              options={customers.map(customer => ({
                value: customer.id,
                label: customer.name
              }))}
              value={formData.customerId}
              onValueChange={(value) => handleSelectChange('customerId', value)}
              placeholder="Select a customer"
              required
              emptyMessage="No customers found."
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                name="status"
                value={formData.status}
                onValueChange={(value) => handleSelectChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLANNING">Planning</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="ON_HOLD">On Hold</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                name="priority"
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
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="quotedAmount">Quoted Amount</Label>
              <Input
                id="quotedAmount"
                name="quotedAmount"
                type="number"
                step="0.01"
                value={formData.quotedAmount}
                onChange={handleInputChange}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Date fields for both Quotes and Jobs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">{recordType === 'QUOTE' ? 'Quote Start Date' : 'Job Start Date'}</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                value={formData.startDate}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <Label htmlFor="endDate">{recordType === 'QUOTE' ? 'Quote End Date' : 'Job End Date'}</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                value={formData.endDate}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : `Create ${recordType === 'QUOTE' ? 'Quote' : 'Job'}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}


