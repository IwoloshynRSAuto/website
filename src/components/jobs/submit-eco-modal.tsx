'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-react'
import { ECOSheet } from './eco-sheet'

interface SubmitECOModalProps {
  jobId: string
  jobNumber: string
  timeEntries: Array<{
    id: string
    laborCodeId: string | null
    laborCode: {
      id: string
      code: string
      name: string
      category: string
      hourlyRate: number
    } | null
    regularHours: number
    overtimeHours: number
    totalHours: number
  }>
  laborCodes: Array<{
    id: string
    code: string
    name: string
    category: string
    hourlyRate: number
  }>
  quotedLabor: Array<{
    laborCodeId: string
    estimatedHours: number
  }>
  onECOSubmitted: () => void
}

export function SubmitECOModal({
  jobId,
  jobNumber,
  timeEntries,
  laborCodes,
  quotedLabor,
  onECOSubmitted,
}: SubmitECOModalProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        className="text-xs h-6 px-2"
        onClick={() => setIsSheetOpen(true)}
      >
        <FileText className="h-3 w-3 mr-1" />
        ECO
      </Button>
      
      <ECOSheet
        isOpen={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        jobId={jobId}
        jobNumber={jobNumber}
        timeEntries={timeEntries}
        laborCodes={laborCodes}
        quotedLabor={quotedLabor}
        onECOApplied={onECOSubmitted}
      />
    </>
  )
}