'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'react-hot-toast'

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  address?: string | null
  isActive: boolean
  fileLink?: string | null
}

interface EditCustomerDialogProps {
  customer: Customer
  isOpen: boolean
  onClose: () => void
}

export function EditCustomerDialog({ customer, isOpen, onClose }: EditCustomerDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    isActive: true,
    fileLink: ''
  })

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        isActive: customer.isActive,
        fileLink: customer.fileLink || ''
      })
    }
  }, [customer])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, isActive: checked }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate name
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
        fileLink: formData.fileLink?.trim() || null
      }

      console.log('[EditCustomerDialog] Updating customer with payload:', payload)

      const response = await fetch(`/api/customers/${customer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast.success('Customer updated successfully')
        onClose()
        router.refresh()
      } else {
        console.error('[EditCustomerDialog] API Error:', data)
        const errorMessage = data.details 
          ? `Validation error: ${JSON.stringify(data.details)}` 
          : data.error || 'Failed to update customer'
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error('[EditCustomerDialog] Error updating customer:', error)
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while updating the customer'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
          <DialogDescription>
            Update customer information. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="name">Customer Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="ABC Company Inc."
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="contact@example.com"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="123 Main St, City, State ZIP"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="fileLink">File Link</Label>
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
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={handleCheckboxChange}
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Active Customer
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

