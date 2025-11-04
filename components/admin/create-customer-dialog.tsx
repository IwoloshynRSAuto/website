'use client'

import { useState } from 'react'
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
import { Building2 } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface CreateCustomerDialogProps {
  isOpen?: boolean
  onClose?: () => void
}

export function CreateCustomerDialog({ isOpen: controlledIsOpen, onClose }: CreateCustomerDialogProps = {}) {
  const router = useRouter()
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  // Use controlled state if provided, otherwise use internal state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen
  const setIsOpen = (open: boolean) => {
    if (controlledIsOpen === undefined) {
      setInternalIsOpen(open)
    } else if (!open && onClose) {
      onClose()
    }
  }
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    isActive: true,
    fileLink: ''
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, isActive: checked }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
            body: JSON.stringify({
              name: formData.name,
              email: formData.email || null,
              phone: formData.phone || null,
              isActive: formData.isActive,
              fileLink: formData.fileLink || null
            }),
      })

      if (response.ok) {
        toast.success('Customer created successfully')
        setIsOpen(false)
            setFormData({
              name: '',
              email: '',
              phone: '',
              isActive: true,
              fileLink: ''
            })
        router.refresh()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to create customer')
      }
    } catch (error) {
      console.error('Error creating customer:', error)
      toast.error('An error occurred while creating the customer')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
          <DialogDescription>
            Create a new customer account. Fill in the details below.
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
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Customer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

