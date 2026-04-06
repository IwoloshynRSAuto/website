'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, Plus, User } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Customer {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  isActive: boolean
}

interface CustomerSelectorProps {
  customers: Customer[]
  selectedCustomerId: string | null
  onCustomerChange: (customerId: string | null) => void
  disabled?: boolean
}

export function CustomerSelector({ 
  customers, 
  selectedCustomerId, 
  onCustomerChange, 
  disabled = false 
}: CustomerSelectorProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId)

  const handleCreateCustomer = async () => {
    if (!newCustomerName.trim()) {
      toast.error('Customer name is required')
      return
    }

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCustomerName.trim()
        }),
      })

      if (response.ok) {
        const newCustomer = await response.json()
        onCustomerChange(newCustomer.id)
        setNewCustomerName('')
        setIsCreating(false)
        toast.success('Customer created successfully!')
      } else {
        const errorData = await response.json()
        toast.error(`Failed to create customer: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error creating customer:', error)
      toast.error('Failed to create customer')
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 px-2 text-xs"
            disabled={disabled}
          >
            <User className="h-3 w-3 mr-1" />
            {selectedCustomer ? selectedCustomer.name : 'Select Customer'}
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuItem 
            onClick={() => onCustomerChange(null)}
            className="text-gray-500"
          >
            No Customer
          </DropdownMenuItem>
          {customers.map((customer) => (
            <DropdownMenuItem
              key={customer.id}
              onClick={() => onCustomerChange(customer.id)}
            >
              <div className="flex flex-col">
                <span className="font-medium">{customer.name}</span>
                {customer.email && (
                  <span className="text-xs text-gray-500">{customer.email}</span>
                )}
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem 
            onClick={() => setIsCreating(true)}
            className="text-blue-600 border-t"
          >
            <Plus className="h-3 w-3 mr-2" />
            Create New Customer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {isCreating && (
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={newCustomerName}
            onChange={(e) => setNewCustomerName(e.target.value)}
            placeholder="Customer name"
            className="px-2 py-1 text-xs border border-gray-300 rounded"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreateCustomer()
              } else if (e.key === 'Escape') {
                setIsCreating(false)
                setNewCustomerName('')
              }
            }}
          />
          <Button
            size="sm"
            onClick={handleCreateCustomer}
            className="h-6 px-2 text-xs"
          >
            Create
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setIsCreating(false)
              setNewCustomerName('')
            }}
            className="h-6 px-2 text-xs"
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}

