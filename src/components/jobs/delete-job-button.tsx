'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface DeleteJobButtonProps {
  jobId: string
  jobNumber: string
}

export function DeleteJobButton({ jobId, jobNumber }: DeleteJobButtonProps) {
  const { toast } = useToast()
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete job ${jobNumber}? This action cannot be undone.\n\nAll associated time entries will also be deleted.`)) {
      return
    }

    setIsDeleting(true)
    
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        const result = await response.json()
        if (result.deletedTimeEntries > 0) {
          toast({ title: `Job deleted (${result.deletedTimeEntries} time entries removed)` })
        } else {
          toast({ title: 'Job deleted successfully' })
        }
        router.push('/dashboard/jobs')
        router.refresh()
      } else {
        const error = await response.json()
        toast({ title: 'Failed to delete job', description: error.details || error.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Failed to delete job', variant: 'destructive' })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Button
      variant="destructive"
      onClick={handleDelete}
      disabled={isDeleting}
      className="flex items-center"
    >
      <Trash2 className="h-4 w-4 mr-2" />
      {isDeleting ? 'Deleting...' : 'Delete'}
    </Button>
  )
}

