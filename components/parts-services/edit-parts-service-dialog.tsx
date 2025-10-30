'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'

interface PartsService {
  id: string
  jobNumber: string
  createdBy: string | null
  customerName: string | null
  custContact: string | null
  description: string | null
  vendor: string | null
  startDate: Date | null
  dueDate: Date | null
  jobStatus: string | null
  inQuickBooks: boolean
  inLDrive: boolean
  quoteNumber: string | null
  invoiced: string | null
  dateInvoiced: Date | null
  notes: string | null
}

interface EditPartsServiceDialogProps {
  partsService: PartsService | null
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

export function EditPartsServiceDialog({ 
  partsService, 
  isOpen, 
  onClose, 
  onSave 
}: EditPartsServiceDialogProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    jobNumber: '',
    createdBy: '',
    customerName: '',
    custContact: '',
    description: '',
    vendor: '',
    startDate: '',
    dueDate: '',
    jobStatus: '',
    inQuickBooks: false,
    inLDrive: false,
    quoteNumber: '',
    invoiced: '',
    dateInvoiced: '',
    notes: '',
  })

  // Update form data when partsService changes
  useEffect(() => {
    if (partsService) {
      setFormData({
        jobNumber: partsService.jobNumber || '',
        createdBy: partsService.createdBy || '',
        customerName: partsService.customerName || '',
        custContact: partsService.custContact || '',
        description: partsService.description || '',
        vendor: partsService.vendor || '',
        startDate: partsService.startDate ? format(new Date(partsService.startDate), 'yyyy-MM-dd') : '',
        dueDate: partsService.dueDate ? format(new Date(partsService.dueDate), 'yyyy-MM-dd') : '',
        jobStatus: partsService.jobStatus || '',
        inQuickBooks: partsService.inQuickBooks || false,
        inLDrive: partsService.inLDrive || false,
        quoteNumber: partsService.quoteNumber || '',
        invoiced: partsService.invoiced || '',
        dateInvoiced: partsService.dateInvoiced ? format(new Date(partsService.dateInvoiced), 'yyyy-MM-dd') : '',
        notes: partsService.notes || '',
      })
    }
  }, [partsService])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }))
  }

  const handleSave = async () => {
    if (!partsService) return

    setSaving(true)
    try {
      const response = await fetch(`/api/parts-services/${partsService.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobNumber: formData.jobNumber,
          createdBy: formData.createdBy || null,
          customerName: formData.customerName || null,
          custContact: formData.custContact || null,
          description: formData.description || null,
          vendor: formData.vendor || null,
          startDate: formData.startDate || null,
          dueDate: formData.dueDate || null,
          jobStatus: formData.jobStatus || null,
          inQuickBooks: formData.inQuickBooks,
          inLDrive: formData.inLDrive,
          quoteNumber: formData.quoteNumber || null,
          invoiced: formData.invoiced || null,
          dateInvoiced: formData.dateInvoiced || null,
          notes: formData.notes || null,
        }),
      })

      if (response.ok) {
        toast.success('Parts/Service updated successfully')
        onSave()
        onClose()
        router.refresh()
      } else {
        const errorData = await response.json()
        toast.error(`Failed to update: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error updating parts/service:', error)
      toast.error('An error occurred while updating')
    } finally {
      setSaving(false)
    }
  }

  if (!partsService) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Parts & Service</DialogTitle>
          <DialogDescription>
            Update the details for {partsService.jobNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="jobNumber">Job Number *</Label>
            <Input
              id="jobNumber"
              name="jobNumber"
              value={formData.jobNumber}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="createdBy">Created By</Label>
            <Input
              id="createdBy"
              name="createdBy"
              value={formData.createdBy}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerName">Customer</Label>
            <Input
              id="customerName"
              name="customerName"
              value={formData.customerName}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="custContact">Customer Contact</Label>
            <Input
              id="custContact"
              name="custContact"
              value={formData.custContact}
              onChange={handleInputChange}
            />
          </div>

          <div className="col-span-2 space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendor">Vendor</Label>
            <Input
              id="vendor"
              name="vendor"
              value={formData.vendor}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="jobStatus">Status</Label>
            <Input
              id="jobStatus"
              name="jobStatus"
              value={formData.jobStatus}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              value={formData.startDate}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              name="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quoteNumber">Quote Number</Label>
            <Input
              id="quoteNumber"
              name="quoteNumber"
              value={formData.quoteNumber}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoiced">Invoiced</Label>
            <Input
              id="invoiced"
              name="invoiced"
              value={formData.invoiced}
              onChange={handleInputChange}
              placeholder="e.g., 100 or 100%"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateInvoiced">Date Invoiced</Label>
            <Input
              id="dateInvoiced"
              name="dateInvoiced"
              type="date"
              value={formData.dateInvoiced}
              onChange={handleInputChange}
            />
          </div>

          <div className="col-span-2 space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="inQuickBooks"
              checked={formData.inQuickBooks}
              onChange={(e) => handleCheckboxChange('inQuickBooks', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Label htmlFor="inQuickBooks" className="cursor-pointer">In QuickBooks</Label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="inLDrive"
              checked={formData.inLDrive}
              onChange={(e) => handleCheckboxChange('inLDrive', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Label htmlFor="inLDrive" className="cursor-pointer">In L Drive</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

