'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Building2, Mail, Phone, MapPin, Folder, Plus } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { EditCustomerDialog } from './edit-customer-dialog'
import { CreateCustomerDialog } from './create-customer-dialog'
import { StandardTable } from '@/components/common/standard-table'

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  isActive: boolean
  fileLink: string | null
  createdAt: Date
  updatedAt: Date
  _count: {
    jobs: number
  }
}

interface CustomersTableProps {
  customers: Customer[]
  isAdmin?: boolean
}

export function CustomersTable({ customers, isAdmin = false }: CustomersTableProps) {
  const router = useRouter()
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)

  const openInFileExplorer = async (filePath: string | null): Promise<void> => {
    if (!filePath) {
      toast.error('No file path available')
      return
    }
    
    try {
      const response = await fetch('/api/open-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filePath }),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast.success('Opening folder in File Explorer...')
      } else {
        console.error('Failed to open folder:', data.error)
        
        try {
          await navigator.clipboard.writeText(filePath)
          toast.success(`Path copied to clipboard: ${filePath}`)
        } catch (clipboardError) {
          toast.error(`Failed to open folder. Path: ${filePath}`)
        }
      }
    } catch (error) {
      console.error('Error opening folder:', error)
      toast.error('Failed to open folder')
    }
  }

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Are you sure you want to delete customer "${customer.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Customer deleted successfully')
        router.refresh()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete customer')
      }
    } catch (error) {
      console.error('Error deleting customer:', error)
      toast.error('An error occurred while deleting the customer')
    }
  }

  const columns = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (value: string, customer: Customer) => (
        <div className="flex items-center space-x-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{value}</span>
        </div>
      )
    },
    {
      key: 'contact',
      label: 'Contact',
      render: (value: any, customer: Customer) => (
        <div className="space-y-1">
          {customer.email && (
            <div className="flex items-center space-x-1 text-sm">
              <Mail className="h-3 w-3 text-muted-foreground" />
              <span>{customer.email}</span>
            </div>
          )}
          {customer.phone && (
            <div className="flex items-center space-x-1 text-sm">
              <Phone className="h-3 w-3 text-muted-foreground" />
              <span>{customer.phone}</span>
            </div>
          )}
          {!customer.email && !customer.phone && (
            <span className="text-sm text-muted-foreground">No contact</span>
          )}
        </div>
      )
    },
    {
      key: 'jobs',
      label: 'Jobs',
      sortable: true,
      className: 'text-center',
      render: (value: any, customer: Customer) => (
        <Badge variant="outline">{customer._count.jobs}</Badge>
      )
    },
    {
      key: 'fileLink',
      label: 'File Link',
      className: 'text-center',
      render: (value: string | null, customer: Customer) => (
        customer.fileLink ? (
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
            onClick={(e) => {
              e.stopPropagation()
              openInFileExplorer(customer.fileLink)
            }}
          >
            <Folder className="h-3 w-3 mr-1" />
            Open Folder
          </Button>
        ) : (
          <span className="text-gray-400 text-xs">No link</span>
        )
      )
    },
    {
      key: 'isActive',
      label: 'Status',
      sortable: true,
      className: 'text-center',
      render: (value: boolean, customer: Customer) => (
        <Badge variant={customer.isActive ? 'default' : 'secondary'}>
          {customer.isActive ? 'Active' : 'Inactive'}
        </Badge>
      )
    }
  ]

  const createButton = isAdmin ? (
    <CreateCustomerDialog />
  ) : null

  return (
    <>
      <StandardTable
        title="Customers"
        data={customers}
        columns={columns}
        searchFields={['name', 'email', 'phone']}
        onEdit={isAdmin ? (customer) => setEditingCustomer(customer) : undefined}
        onDelete={isAdmin ? handleDelete : undefined}
        createButton={createButton}
        emptyMessage="No customers found"
        showEditButton={false}
      />

      {editingCustomer && (
        <EditCustomerDialog
          customer={editingCustomer}
          isOpen={!!editingCustomer}
          onClose={() => setEditingCustomer(null)}
        />
      )}
    </>
  )
}