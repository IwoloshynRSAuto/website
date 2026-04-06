'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Info, Loader2, Save, X } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { dashboardUi } from '@/components/layout/dashboard-ui'
import { cn } from '@/lib/utils'

interface QuotedLabor {
  laborCodeId: string
  estimatedHours: number
}

interface LaborCode {
  id: string
  code: string
  name: string
  category: string
  hourlyRate: number
}

interface TimeEntry {
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
}

interface ECOSheetProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  jobNumber: string
  timeEntries: TimeEntry[]
  laborCodes: LaborCode[]
  quotedLabor: QuotedLabor[]
  onECOApplied: () => void
}

export function ECOSheet({
  isOpen,
  onOpenChange,
  jobId,
  jobNumber,
  timeEntries,
  laborCodes,
  quotedLabor,
  onECOApplied,
}: ECOSheetProps) {
  const { toast } = useToast()
  const [editedLabor, setEditedLabor] = useState<
    Array<{
      id: string
      laborCodeId: string
      hours: number
      isNew?: boolean
    }>
  >([])
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (laborCodes.length > 0) {
      const allLaborCodes = laborCodes.map((lc) => {
        const quotedLaborEntry = quotedLabor.find((ql) => ql.laborCodeId === lc.id)
        const currentHours = quotedLaborEntry ? quotedLaborEntry.estimatedHours : 0
        return {
          id: `labor-${lc.id}`,
          laborCodeId: lc.id,
          hours: currentHours,
          isNew: false,
        }
      })
      setEditedLabor(allLaborCodes)
    }
  }, [laborCodes, quotedLabor])

  const handleHourChange = (laborId: string, hours: number) => {
    setEditedLabor((prev) =>
      prev.map((labor) => (labor.id === laborId ? { ...labor, hours } : labor))
    )
  }

  const getLaborCode = (laborCodeId: string) => laborCodes.find((lc) => lc.id === laborCodeId)

  const calculateTotals = () => {
    const totalHours = editedLabor.reduce((sum, labor) => sum + labor.hours, 0)
    const totalCost = editedLabor.reduce((sum, labor) => {
      const laborCode = getLaborCode(labor.laborCodeId)
      return sum + labor.hours * (laborCode?.hourlyRate || 0)
    }, 0)
    return { totalHours, totalCost }
  }

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast({ title: 'Reason required', description: 'Please provide a reason for the change.', variant: 'destructive' })
      return
    }

    setIsSubmitting(true)
    try {
      const { totalHours, totalCost } = calculateTotals()

      const originalTotalHours = timeEntries.reduce((sum, entry) => sum + entry.totalHours, 0)
      const originalTotalCost = timeEntries.reduce((sum, entry) => {
        const lc = getLaborCode(entry.laborCodeId || '')
        return sum + entry.totalHours * (lc?.hourlyRate || 0)
      }, 0)

      const ecoResponse = await fetch('/api/eco', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          oldHours: originalTotalHours,
          newHours: totalHours,
          oldCost: originalTotalCost,
          newCost: totalCost,
          reasonForChange: reason.trim(),
          laborChanges: editedLabor,
        }),
      })

      if (!ecoResponse.ok) {
        const err = await ecoResponse.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to create ECO')
      }

      const eco = await ecoResponse.json()

      const applyResponse = await fetch('/api/eco/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ecoId: eco.id }),
      })

      if (!applyResponse.ok) {
        const err = await applyResponse.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to apply ECO')
      }

      toast({ title: 'ECO applied', description: 'Quoted labor has been updated.' })
      onOpenChange(false)
      onECOApplied()
    } catch (error) {
      console.error('Error submitting ECO:', error)
      toast({
        title: 'ECO failed',
        description: error instanceof Error ? error.message : 'Failed to submit ECO',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const { totalHours, totalCost } = calculateTotals()

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex max-h-[min(92vh,900px)] w-[min(100vw-1.5rem,56rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl'
        )}
        onPointerDownOutside={(e) => {
          if (isSubmitting) e.preventDefault()
        }}
      >
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
          <DialogTitle className="text-xl font-semibold text-foreground">
            Labor hours — {jobNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="eco-reason">Reason for change</Label>
            <Textarea
              id="eco-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why these changes are needed…"
              rows={3}
              className="resize-none border-border"
            />
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">ECO hours update</h3>
              <div className="flex items-baseline gap-4 tabular-nums">
                <span className="text-lg font-semibold text-blue-700">{totalHours.toFixed(1)} h</span>
                <span className="text-lg font-semibold text-orange-600">
                  $
                  {totalCost.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            <div
              className="flex gap-2 rounded-lg border border-blue-200 bg-blue-50/80 px-3 py-2.5 text-sm text-blue-900"
              role="note"
            >
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden />
              <p>
                <span className="font-medium">How to use:</span> Edit hours per labor code. Totals update as you type;
                submit when ready to record the ECO.
              </p>
            </div>

            <div className="overflow-hidden rounded-lg border border-border">
              <div className="max-h-[min(50vh,420px)] overflow-auto">
                <table className="w-full min-w-[520px] table-fixed border-collapse text-sm">
                  <colgroup>
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '36%' }} />
                    <col style={{ width: '16%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '18%' }} />
                  </colgroup>
                  <thead>
                    <tr className="border-b bg-muted/60">
                      <th className="px-2 py-2.5 text-left text-xs font-semibold text-muted-foreground">Code</th>
                      <th className="px-2 py-2.5 text-left text-xs font-semibold text-muted-foreground">Name</th>
                      <th className="px-2 py-2.5 text-right text-xs font-semibold text-muted-foreground">Rate</th>
                      <th className="px-2 py-2.5 text-right text-xs font-semibold text-muted-foreground">New hours</th>
                      <th className="px-2 py-2.5 text-right text-xs font-semibold text-muted-foreground">New cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editedLabor.map((labor) => {
                      const laborCode = getLaborCode(labor.laborCodeId)
                      const cost = labor.hours * (laborCode?.hourlyRate || 0)
                      const hasSubmittedHours = timeEntries.some((e) => e.laborCodeId === labor.laborCodeId)
                      const originalEntry = quotedLabor.find((ql) => ql.laborCodeId === labor.laborCodeId)
                      const originalHours = originalEntry ? originalEntry.estimatedHours : 0
                      const hoursChanged = labor.hours !== originalHours

                      return (
                        <tr
                          key={labor.id}
                          className={cn(
                            'border-b align-middle last:border-0',
                            hasSubmittedHours && 'bg-blue-50/50',
                            hoursChanged && 'bg-amber-50/40'
                          )}
                        >
                          <td className="px-2 py-2 font-mono text-xs">{laborCode?.code ?? '—'}</td>
                          <td className="max-w-0 truncate px-2 py-2" title={laborCode?.name}>
                            <span className="text-foreground">{laborCode?.name ?? '—'}</span>
                            {originalHours > 0 && (
                              <span className="mt-0.5 block text-xs text-muted-foreground">
                                Was {originalHours.toFixed(1)} h
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                            ${(laborCode?.hourlyRate ?? 0).toFixed(2)}
                          </td>
                          <td className="px-1 py-1.5">
                            <Input
                              type="number"
                              min={0}
                              step={0.5}
                              value={labor.hours}
                              onChange={(e) => handleHourChange(labor.id, parseFloat(e.target.value) || 0)}
                              className="h-9 text-right tabular-nums"
                            />
                          </td>
                          <td className="px-2 py-2 text-right text-sm font-medium tabular-nums text-orange-600">
                            $
                            {cost.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border px-6 py-4 sm:justify-between">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button
            type="button"
            className={dashboardUi.primaryButton}
            onClick={() => void handleSubmit()}
            disabled={isSubmitting || totalHours === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Submit &amp; apply ECO
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
