'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { CreateJobDialog, type QuoteDestination } from './create-job-dialog'

import { dashboardUi } from '@/components/layout/dashboard-ui'
import { cn } from '@/lib/utils'

export interface CreateJobButtonProps {
  /** `job` → E numbers only; `quote` → Q numbers only. */
  variant?: 'job' | 'quote'
  /** When `variant="quote"`: pipeline = POST /api/quotes; job_row = POST /api/jobs type QUOTE. */
  quoteDestination?: QuoteDestination
  label?: string
  className?: string
  onCreated?: () => void
}

export function CreateJobButton({
  variant = 'job',
  quoteDestination,
  label,
  className,
  onCreated,
}: CreateJobButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const resolvedLabel = label ?? (variant === 'job' ? 'Add job' : 'Add quote')
  const resolvedQuoteDestination =
    variant === 'quote' ? (quoteDestination ?? 'quote_pipeline') : 'quote_pipeline'

  return (
    <>
      <Button
        onClick={() => setIsDialogOpen(true)}
        className={cn(dashboardUi.primaryButton, className)}
      >
        <Plus className="h-5 w-5 mr-2" />
        {resolvedLabel}
      </Button>

      <CreateJobDialog
        mode={variant}
        quoteDestination={variant === 'quote' ? resolvedQuoteDestination : undefined}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onCreated={onCreated}
      />
    </>
  )
}
