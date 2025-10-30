'use client'

import { useState } from 'react'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'react-hot-toast'
import { Plus } from 'lucide-react'

export function CreatePartsServiceDialog() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.jobNumber.trim()) {
      toast.error('Job Number is required')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/parts-services', {
        method: 'POST',
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
        toast.success('Parts/Service created successfully')
        setIsOpen(false)
        // Reset form
        setFormData({
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
        router.refresh()
      } else {
        const errorData = await response.json()
        toast.error(`Failed to create: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error creating parts/service:', error)
      toast.error('An error occurred while creating')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Part/Service
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Part/Service</DialogTitle>
          <DialogDescription>
            Create a new parts or service entry
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="jobNumber">Job Number *</Label>
              <Input
                id="jobNumber"
                name="jobNumber"
                value={formData.jobNumber}
                onChange={handleInputChange}
                placeholder="P1234"
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
                placeholder="Initials"
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
                placeholder="e.g., Open, Billed"
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
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating...' : 'Create Part/Service'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

