'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { CreateCustomerDialog } from './create-customer-dialog'

export function CreateCustomerButton() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <>
      <Button 
        onClick={() => setIsDialogOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        <Plus className="h-4 w-4 mr-2" />
        New Customer
      </Button>
      
      <CreateCustomerDialog 
        isOpen={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
      />
    </>
  )
}

