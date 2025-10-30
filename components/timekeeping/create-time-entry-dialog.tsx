'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'react-hot-toast'
import { TimeInputWithCalculation } from './time-input-with-calculation'

interface User {
  id: string
  name: string
  email: string
}

interface Job {
  id: string
  jobNumber: string
  title: string
}

interface LaborCode {
  id: string
  code: string
  description: string
  hourlyRate: number | null
}

interface CreateTimeEntryDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateTimeEntryDialog({ isOpen, onClose }: CreateTimeEntryDialogProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [laborCodes, setLaborCodes] = useState<LaborCode[]>([])
  const isAdmin = session?.user?.role === 'ADMIN'
  const currentUserId = session?.user?.id || ''
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0], // Today's date
    regularHours: '',
    overtimeHours: '',
    notes: '',
    billable: true,
    rate: '',
    userId: currentUserId,
    jobId: '',
    laborCodeId: ''
  })

  // Fetch users, jobs, and labor codes when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchUsers()
      fetchJobs()
      fetchLaborCodes()
      // Set user ID to current user if not admin
      if (!isAdmin && currentUserId) {
        setFormData(prev => ({ ...prev, userId: currentUserId }))
      }
    }
  }, [isOpen, currentUserId, isAdmin])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users?activeOnly=true')
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs')
      if (response.ok) {
        const data = await response.json()
        setJobs(data)
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error)
    }
  }

  const fetchLaborCodes = async () => {
    try {
      const response = await fetch('/api/labor-codes?isActive=true')
      if (response.ok) {
        const data = await response.json()
        setLaborCodes(data)
      }
    } catch (error) {
      console.error('Failed to fetch labor codes:', error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Auto-populate rate when labor code is selected
    if (name === 'laborCodeId' && value) {
      const selectedLaborCode = laborCodes.find(code => code.id === value)
      if (selectedLaborCode && selectedLaborCode.hourlyRate !== null && selectedLaborCode.hourlyRate !== undefined) {
        setFormData(prev => ({ ...prev, rate: Number(selectedLaborCode.hourlyRate).toString() }))
      }
    }
  }

  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, billable: checked }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Validate required fields
    if (!formData.userId) {
      toast.error('Please select a user')
      setIsLoading(false)
      return
    }
    if (!formData.jobId) {
      toast.error('Please select a job')
      setIsLoading(false)
      return
    }

    const requestData = {
      date: formData.date,
      regularHours: parseFloat(formData.regularHours) || 0,
      overtimeHours: parseFloat(formData.overtimeHours) || 0,
      notes: formData.notes || null,
      billable: formData.billable,
      rate: formData.rate ? parseFloat(formData.rate) : null,
      userId: formData.userId,
      jobId: formData.jobId,
      laborCodeId: formData.laborCodeId === 'none' ? null : formData.laborCodeId || null
    }

    console.log('Submitting time entry:', requestData)

    try {
      const response = await fetch('/api/time-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      if (response.ok) {
        toast.success('Time entry created successfully')
        onClose()
        router.refresh()
        // Reset form
        setFormData({
          date: new Date().toISOString().split('T')[0],
          regularHours: '',
          overtimeHours: '',
          notes: '',
          billable: true,
          rate: '',
          userId: '',
          jobId: '',
          laborCodeId: ''
        })
      } else {
        const errorData = await response.json()
        console.error('Time entry creation failed:', errorData)
        
        // Show detailed validation errors if available
        if (errorData.details && Array.isArray(errorData.details)) {
          const validationErrors = errorData.details.map((err: any) => `${err.path.join('.')}: ${err.message}`).join(', ')
          toast.error(`Validation errors: ${validationErrors}`)
        } else {
          toast.error(`Failed to create time entry: ${errorData.error || 'Unknown error'}`)
        }
      }
    } catch (error) {
      console.error('Error creating time entry:', error)
      toast.error('An error occurred while creating the time entry')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Time Entry</DialogTitle>
          <DialogDescription>
            Create a new time entry for tracking work hours and billable time.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="col-span-2">
                <TimeInputWithCalculation
                  regularHours={formData.regularHours}
                  overtimeHours={formData.overtimeHours}
                  onRegularHoursChange={(hours) => handleInputChange({ target: { name: 'regularHours', value: hours.toString() } })}
                  onOvertimeHoursChange={(hours) => handleInputChange({ target: { name: 'overtimeHours', value: hours.toString() } })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="userId">User *</Label>
                <Select
                  value={formData.userId}
                  onValueChange={isAdmin ? (value) => handleSelectChange('userId', value) : undefined}
                  disabled={!isAdmin}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <SearchableSelect
                  label="Job"
                  required
                  options={jobs.map(job => ({
                    value: job.id,
                    label: `${job.jobNumber} - ${job.title}`,
                    searchText: `${job.jobNumber} ${job.title} ${job.status || ''}`
                  }))}
                  value={formData.jobId}
                  onValueChange={(value) => handleSelectChange('jobId', value)}
                  placeholder="Select a job"
                  emptyMessage="No jobs found."
                />
              </div>
            </div>

            <div>
              <Label htmlFor="laborCodeId">Labor Code (Optional)</Label>
              <Select
                value={formData.laborCodeId}
                onValueChange={(value) => handleSelectChange('laborCodeId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a labor code" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No labor code</SelectItem>
                  {laborCodes.map((code) => (
                  <SelectItem key={code.id} value={code.id}>
                    {code.code} - {(code as any).name || code.description || 'Unnamed'}
                    {code.hourlyRate !== null && code.hourlyRate !== undefined && ` ($${Number(code.hourlyRate).toFixed(2)}/hr)`}
                  </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Add any notes about the work performed..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rate">Hourly Rate (Optional)</Label>
                <Input
                  id="rate"
                  name="rate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.rate}
                  onChange={handleInputChange}
                  placeholder="75.00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to use labor code rate
                </p>
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id="billable"
                  checked={formData.billable}
                  onCheckedChange={handleCheckboxChange}
                />
                <Label htmlFor="billable">Billable</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Time Entry'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
