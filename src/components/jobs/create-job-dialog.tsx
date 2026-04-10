'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { useToast } from '@/components/ui/use-toast'
import { normalizeProjectJobNumber, normalizeQuoteRecordNumber } from '@/lib/utils/job-number'

export type QuoteDestination = 'job_row' | 'quote_pipeline'

function storageKey(mode: 'job' | 'quote', quoteDestination?: QuoteDestination) {
  if (mode === 'job') return 'create-job-dialog-v3-job'
  const qd = quoteDestination ?? 'quote_pipeline'
  return qd === 'job_row' ? 'create-job-dialog-v3-quote-jobrow' : 'create-job-dialog-v3-quote-pipeline'
}

/** YYYY-MM-DD from date input → ISO at noon UTC; invalid/empty → null (never throws). */
function dateInputToNoonISO(value: string | undefined | null): string | null {
  const v = value?.trim()
  if (!v) return null
  const d = new Date(`${v}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

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

export interface CreateJobDialogProps {
  isOpen: boolean
  onClose: () => void
  /** Separate entry points: job = E… only, quote = Q… only (no in-dialog toggle). */
  mode: 'job' | 'quote'
  /**
   * When `mode === 'quote'`: `quote_pipeline` = real quote in `/api/quotes` (kanban).
   * `job_row` = legacy `jobs` row with type QUOTE (jobs board).
   */
  quoteDestination?: QuoteDestination
  selectedQuote?: Quote | null
  /** After a successful create (e.g. reload kanban). */
  onCreated?: () => void
}

export function CreateJobDialog({
  isOpen,
  onClose,
  mode,
  quoteDestination = 'quote_pipeline',
  selectedQuote,
  onCreated,
}: CreateJobDialogProps) {
  const { toast } = useToast()
  const router = useRouter()
  const recordType = mode === 'job' ? 'JOB' : 'QUOTE'

  const [isLoading, setIsLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])

  const loadFormData = useCallback(() => {
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
        fileLink: '',
      }
    }

    try {
      const stored = localStorage.getItem(storageKey(mode, quoteDestination))
      if (stored) {
        const parsed = JSON.parse(stored)
        return {
          jobNumber: '',
          title: parsed.title || '',
          description: parsed.description || '',
          customerId: parsed.customerId || '',
          quoteId: '',
          status: parsed.status || 'PLANNING',
          priority: parsed.priority || 'MEDIUM',
          startDate: parsed.startDate || new Date().toISOString().split('T')[0],
          endDate: parsed.endDate || '',
          quotedAmount: parsed.quotedAmount || '',
          assignedTo: parsed.assignedTo || '',
          fileLink: parsed.fileLink || '',
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
      fileLink: '',
    }
  }, [mode, quoteDestination])

  const [formData, setFormData] = useState(() => loadFormData())
  const isInitialMount = useRef(true)
  const skipNextSave = useRef(false)

  const fetchSuggestedNumber = useCallback(async () => {
    const suggest = mode === 'job' ? 'job' : 'quote'
    try {
      const response = await fetch(`/api/jobs?suggest=${suggest}`)
      if (!response.ok) return
      const result = await response.json()
      const next = result.jobNumber as string | undefined
      if (next) {
        setFormData((prev) => ({ ...prev, jobNumber: next }))
      }
    } catch (error) {
      console.error('Failed to fetch suggested number:', error)
      setFormData((prev) => ({
        ...prev,
        jobNumber: mode === 'job' ? 'E1001' : 'Q1001',
      }))
    }
  }, [mode])

  // When dialog opens: restore draft fields, then always suggest next E/Q from full DB (+1 over max).
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(storageKey(mode, quoteDestination))
      if (stored) {
        const parsed = JSON.parse(stored)
        setFormData({
          jobNumber: '',
          title: parsed.title || '',
          description: parsed.description || '',
          customerId: parsed.customerId || '',
          quoteId: '',
          status: parsed.status || 'PLANNING',
          priority: parsed.priority || 'MEDIUM',
          startDate: parsed.startDate || new Date().toISOString().split('T')[0],
          endDate: parsed.endDate || '',
          quotedAmount: parsed.quotedAmount || '',
          assignedTo: parsed.assignedTo || '',
          fileLink: parsed.fileLink || '',
        })
        skipNextSave.current = true
      } else {
        setFormData(loadFormData())
        skipNextSave.current = true
      }

      void fetchCustomers()
      void fetchSuggestedNumber()

      if (selectedQuote && mode === 'job') {
        setFormData((prev) => ({
          ...prev,
          title: selectedQuote.title,
          customerId: '',
          quoteId: selectedQuote.id,
          quotedAmount: selectedQuote.amount.toString(),
        }))
      }
    } catch (e) {
      console.error('[CreateJobDialog] Error on open:', e)
    }
  }, [isOpen, mode, quoteDestination, selectedQuote, fetchSuggestedNumber, loadFormData])

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
          quoteId: selectedQuote && mode === 'job' ? formData.quoteId : '',
        }
        localStorage.setItem(storageKey(mode, quoteDestination), JSON.stringify(dataToSave))
      } catch (e) {
        console.error('[CreateJobDialog] Error saving form data:', e)
      }
    }
  }, [formData, isOpen, mode, quoteDestination, selectedQuote])

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers')
      if (response.ok) {
        const result = await response.json()
        const data = result.data || (Array.isArray(result) ? result : [])
        setCustomers(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error)
      setCustomers([])
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    if (name === 'jobNumber' && !value.trim()) {
      void fetchSuggestedNumber()
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const startDateISO = dateInputToNoonISO(formData.startDate)
      const endDateISO = dateInputToNoonISO(formData.endDate)

      const rawNum = formData.jobNumber.trim()
      const jobNumberPayload =
        mode === 'job' && rawNum
          ? normalizeProjectJobNumber(rawNum)
          : mode === 'quote' && rawNum
            ? normalizeQuoteRecordNumber(rawNum)
            : rawNum || null

      const quoteIdForApi = mode === 'job' ? (selectedQuote?.id ?? null) : null
      const isQuotePipeline = mode === 'quote' && quoteDestination === 'quote_pipeline'

      let response: Response
      if (isQuotePipeline) {
        const body: Record<string, unknown> = {
          title: formData.title,
          description: formData.description || null,
          customerId: formData.customerId?.trim() ? formData.customerId.trim() : null,
          amount: parseFloat(formData.quotedAmount) || 0,
          validUntil: formData.endDate?.trim() || null,
        }
        if (jobNumberPayload) body.quoteNumber = jobNumberPayload
        response = await fetch('/api/quotes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        response = await fetch('/api/jobs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: recordType,
            jobNumber: jobNumberPayload,
            title: formData.title,
            description: formData.description || null,
            customerId: formData.customerId,
            quoteId: quoteIdForApi,
            status: formData.status,
            priority: formData.priority,
            startDate: startDateISO,
            endDate: endDateISO,
            quotedAmount: parseFloat(formData.quotedAmount) || 0,
            assignedToId: formData.assignedTo || null,
            fileLink: formData.fileLink || null,
          }),
        })
      }

      if (response.ok) {
        if (isQuotePipeline) {
          const data = (await response.json()) as { data?: { quoteNumber?: string } }
          const qn = data.data?.quoteNumber
          toast({
            title: 'Quote created',
            description: qn ? `${qn} added to the pipeline.` : 'Added to the pipeline.',
          })
        } else {
          toast({
            title: `${recordType === 'QUOTE' ? 'Quote' : 'Job'} created successfully`,
          })
        }

        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem(storageKey(mode, quoteDestination))
          } catch (err) {
            console.error('[CreateJobDialog] Error clearing form data:', err)
          }
        }

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
          fileLink: '',
        })

        onCreated?.()
        onClose()
        router.refresh()
      } else {
        const text = await response.text()
        let description = `HTTP ${response.status}`
        try {
          const errJson = JSON.parse(text) as { error?: string; message?: string }
          description = errJson.error || errJson.message || description
        } catch {
          if (text.trim()) description = text.trim().slice(0, 280)
        }
        if (response.status === 405 && !isQuotePipeline) {
          description =
            'This server does not allow creating jobs from here yet (missing POST /api/jobs). Deploy the latest app version or contact support.'
        }
        console.error('[CreateJobDialog] create failed', response.status, description)
        toast({
          title: isQuotePipeline ? 'Failed to create quote' : `Failed to create ${recordType === 'QUOTE' ? 'quote' : 'job'}`,
          description,
          variant: 'destructive',
        })
      }
    } catch (err) {
      console.error('[CreateJobDialog]', err)
      toast({
        title: 'An error occurred',
        description: err instanceof Error ? err.message : 'Check the browser console for details.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const numberLabel = mode === 'job' ? 'Job number (E…)' : 'Quote number (Q…)'
  const titleText = mode === 'job' ? 'Add job' : 'Add quote'
  const descriptionText =
    selectedQuote && mode === 'job'
      ? `Create a job from quote ${selectedQuote.quoteNumber}`
      : mode === 'job'
        ? 'Creates an engineering job (E number). No quote is required — optional link only when opened from a quote.'
        : quoteDestination === 'quote_pipeline'
          ? 'Creates a draft in the quote pipeline (quotes module). Next Q is the highest Q in jobs or quotes, plus one. End date is saved as Valid until. File link and job-style status are not stored on the quote record.'
          : 'Creates a legacy quote row on the jobs board (Q number on the jobs table).'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titleText}</DialogTitle>
          <DialogDescription>{descriptionText}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="jobNumber">{numberLabel}</Label>
              <Input
                id="jobNumber"
                name="jobNumber"
                value={formData.jobNumber}
                onChange={handleInputChange}
                placeholder={mode === 'job' ? 'E4053 (auto-filled, editable)' : 'Q2045 (auto-filled, editable)'}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Suggested from the highest {mode === 'job' ? 'E' : 'Q'} number already in the system. Clear the field to refresh the suggestion.
              </p>
            </div>
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                placeholder="e.g., Welding repair"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="fileLink">File link</Label>
            <Input
              id="fileLink"
              name="fileLink"
              value={formData.fileLink}
              onChange={handleInputChange}
              placeholder="L:\Projects\Job123 or file:///L:/Projects/Job123"
            />
            <p className="text-xs text-gray-500 mt-1">
              Shared drive path or file:// URL (optional).
            </p>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Optional details"
            />
          </div>

          <div>
            <SearchableSelect
              label="Customer"
              options={Array.isArray(customers) ? customers.map((customer) => ({
                value: customer.id,
                label: customer.name,
              })) : []}
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
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="quotedAmount">{mode === 'job' ? 'Estimated / quoted $' : 'Quoted amount'}</Label>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start date</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                value={formData.startDate}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <Label htmlFor="endDate">
                {mode === 'quote' && quoteDestination === 'quote_pipeline' ? 'Valid until' : 'End date'}
              </Label>
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
              {isLoading ? 'Creating…' : mode === 'job' ? 'Create job' : 'Create quote'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
