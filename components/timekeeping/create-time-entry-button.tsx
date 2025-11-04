'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CreateTimeEntryDialog } from './create-time-entry-dialog'
import { Plus } from 'lucide-react'

export function CreateTimeEntryButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)}
        className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-all duration-150 ease-in-out"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Time Entry
      </Button>
      <CreateTimeEntryDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}





