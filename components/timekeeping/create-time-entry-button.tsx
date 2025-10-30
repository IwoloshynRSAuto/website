'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CreateTimeEntryDialog } from './create-time-entry-dialog'
import { Plus } from 'lucide-react'

export function CreateTimeEntryButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
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





