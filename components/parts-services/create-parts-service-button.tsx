'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { CreatePartsServiceDialog } from './create-parts-service-dialog'

export function CreatePartsServiceButton() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <>
      <Button 
        onClick={() => setIsDialogOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        <Plus className="h-4 w-4 mr-2" />
        New Parts/Service
      </Button>
      
      <CreatePartsServiceDialog 
        isOpen={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
      />
    </>
  )
}

