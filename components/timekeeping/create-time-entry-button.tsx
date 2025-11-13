'use client'

import { useState, lazy, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

// Lazy load the dialog to avoid initialization issues
const CreateTimeEntryDialog = lazy(() => 
  import('./create-time-entry-dialog').then(module => ({ 
    default: module.CreateTimeEntryDialog 
  })).catch(error => {
    console.error('Error loading CreateTimeEntryDialog:', error)
    // Return a fallback component
    return { 
      default: () => <div>Error loading dialog. Please refresh the page.</div>
    }
  })
)

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
      {isOpen && (
        <Suspense fallback={<div>Loading dialog...</div>}>
          <CreateTimeEntryDialog
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
          />
        </Suspense>
      )}
    </>
  )
}





