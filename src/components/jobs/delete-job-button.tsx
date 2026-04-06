'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface DeleteJobButtonProps {
  jobId: string
  jobNumber: string
}

export function DeleteJobButton({ jobId, jobNumber }: DeleteJobButtonProps) {
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
          toast.success(`Job deleted successfully (${result.deletedTimeEntries} time entries removed)`)
        } else {
          toast.success('Job deleted successfully')
        }
        router.push('/dashboard/jobs')
        router.refresh() // Refresh the router to update the jobs list
      } else {
        const error = await response.json()
        toast.error(error.details || error.error || 'Failed to delete job')
      }
    } catch (error) {
      console.error('Error deleting job:', error)
      toast.error('Failed to delete job. Please try again.')
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

