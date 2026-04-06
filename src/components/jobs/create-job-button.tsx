'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { CreateJobDialog } from './create-job-dialog'

import { dashboardUi } from '@/components/layout/dashboard-ui'
import { cn } from '@/lib/utils'

interface CreateJobButtonProps {
  /** Default: "New Job/Quote" */
  label?: string
  className?: string
}

export function CreateJobButton({ label = 'New Job/Quote', className }: CreateJobButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <>
      <Button 
        onClick={() => setIsDialogOpen(true)}
        className={cn(dashboardUi.primaryButton, className)}
      >
        <Plus className="h-5 w-5 mr-2" />
        {label}
      </Button>
      
      <CreateJobDialog 
        isOpen={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
      />
    </>
  )
}





