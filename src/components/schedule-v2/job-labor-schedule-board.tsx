'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { SchedulingTimeline, type TimelineBlock, type TimelineRow } from '@/components/scheduling/scheduling-timeline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { Trash2 } from 'lucide-react'

type LaborEstimateRow = { id: string; laborCodeId: string; estimatedHours: number }
type LaborCodeLite = { id: string; code: string; name: string }

type ApiSegment = {
  id: string
  jobLaborEstimateId: string
  hours: number
  windowStart: string
  windowEnd: string
  estimate: {
    estimatedHours: number
    laborCode: { code: string; name: string }
  }
}

type DraftCreate = { estimateId: string; start: Date; end: Date }
type DraftHours = { segmentId: string; hours: number; maxHours: number }

function startOfWeek(d: Date) {
  const x = new Date(d)
  const day = x.getDay()
  x.setDate(x.getDate() - day)
  x.setHours(0, 0, 0, 0)
  return x
}

function endOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

function startOfMonth(d: Date) {
  const x = new Date(d)
  x.setDate(1)
  x.setHours(0, 0, 0, 0)
  return x
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}

function startOfQuarter(d: Date) {
  const q = Math.floor(d.getMonth() / 3)
  return new Date(d.getFullYear(), q * 3, 1, 0, 0, 0, 0)
}

function endOfQuarter(d: Date) {
  const q = Math.floor(d.getMonth() / 3)
  const lastMonth = q * 3 + 2
  return new Date(d.getFullYear(), lastMonth + 1, 0, 23, 59, 59, 999)
}

function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0)
}

function endOfYear(d: Date) {
  return new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999)
}

type Preset = 'week' | 'month' | 'quarter' | 'year'

function applyPreset(p: Preset): { start: Date; end: Date } {
  const now = new Date()
  if (p === 'week') {
    const start = startOfWeek(now)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    return { start, end: endOfDay(end) }
  }
  if (p === 'month') {
    const start = startOfWeek(now)
    const end = new Date(start)
    end.setDate(end.getDate() + 27)
    return { start, end: endOfDay(end) }
  }
  if (p === 'quarter') {
    const start = startOfQuarter(now)
    return { start, end: endOfQuarter(now) }
  }
  return { start: startOfYear(now), end: endOfYear(now) }
}

function roundQuarterHours(n: number) {
  return Math.round(n * 4) / 4
}

export function JobLaborScheduleBoard({
  jobId,
  estimates,
  laborCodes,
}: {
  jobId: string
  estimates: LaborEstimateRow[]
  laborCodes: LaborCodeLite[]
}) {
  const { toast } = useToast()
  const [preset, setPreset] = useState<Preset>('month')
  const [rangeStart, setRangeStart] = useState(() => applyPreset('month').start)
  const [rangeEnd, setRangeEnd] = useState(() => applyPreset('month').end)
  const [segments, setSegments] = useState<ApiSegment[]>([])
  const [loading, setLoading] = useState(true)
  const [createDraft, setCreateDraft] = useState<DraftCreate | null>(null)
  const [createHours, setCreateHours] = useState('8')
  const [hoursDraft, setHoursDraft] = useState<DraftHours | null>(null)
  const [editHoursStr, setEditHoursStr] = useState('')

  const codeLabel = useCallback(
    (laborCodeId: string) => {
      const lc = laborCodes.find((c) => c.id === laborCodeId)
      return lc ? `${lc.code} — ${lc.name}` : laborCodeId
    },
    [laborCodes]
  )

  const loadSegments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}/schedule-segments`)
      const json = await res.json()
      if (!json.success) {
        throw new Error(json.error || 'Failed to load schedule')
      }
      setSegments(json.data as ApiSegment[])
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Schedule load failed',
        description: e instanceof Error ? e.message : 'Unknown error',
      })
    } finally {
      setLoading(false)
    }
  }, [jobId, toast])

  useEffect(() => {
    void loadSegments()
  }, [loadSegments])

  const scheduledByEstimate = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of segments) {
      const k = s.jobLaborEstimateId
      m.set(k, (m.get(k) ?? 0) + s.hours)
    }
    return m
  }, [segments])

  const remaining = useCallback(
    (estimateId: string) => {
      const est = estimates.find((e) => e.id === estimateId)
      if (!est) return 0
      const q = Number(est.estimatedHours) || 0
      return Math.max(0, q - (scheduledByEstimate.get(estimateId) ?? 0))
    },
    [estimates, scheduledByEstimate]
  )

  const rows: TimelineRow[] = useMemo(
    () =>
      estimates.map((e) => {
        const rem = remaining(e.id)
        const q = Number(e.estimatedHours) || 0
        return {
          id: e.id,
          label: `${codeLabel(e.laborCodeId)} · ${q}h quoted · ${roundQuarterHours(rem)}h left`,
        }
      }),
    [estimates, codeLabel, remaining]
  )

  const blocks: TimelineBlock[] = useMemo(
    () =>
      segments.map((s) => ({
        id: s.id,
        rowId: s.jobLaborEstimateId,
        start: new Date(s.windowStart),
        end: new Date(s.windowEnd),
        label: `${s.hours}h`,
        subtitle: `${s.estimate.laborCode.code}`,
      })),
    [segments]
  )

  const applyPresetClick = (p: Preset) => {
    setPreset(p)
    const { start, end } = applyPreset(p)
    setRangeStart(start)
    setRangeEnd(end)
  }

  const onRangeCreate = (rowId: string, start: Date, end: Date) => {
    const rem = remaining(rowId)
    if (rem <= 0) {
      toast({ variant: 'destructive', title: 'No hours left', description: 'Increase quoted hours or remove other segments.' })
      return
    }
    const spanH = (end.getTime() - start.getTime()) / 3_600_000
    const def = roundQuarterHours(Math.min(rem, Math.max(0.25, spanH)))
    setCreateHours(String(def))
    setCreateDraft({ estimateId: rowId, start, end })
  }

  const submitCreate = async () => {
    if (!createDraft) return
    const h = Number(createHours)
    if (!Number.isFinite(h) || h <= 0) {
      toast({ variant: 'destructive', title: 'Invalid hours' })
      return
    }
    const max = remaining(createDraft.estimateId) + 1e-6
    if (h > max) {
      toast({ variant: 'destructive', title: 'Too many hours', description: `At most ${roundQuarterHours(max)}h remaining on this line.` })
      return
    }
    const res = await fetch(`/api/jobs/${jobId}/schedule-segments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobLaborEstimateId: createDraft.estimateId,
        windowStart: createDraft.start.toISOString(),
        windowEnd: createDraft.end.toISOString(),
        hours: h,
      }),
    })
    const json = await res.json()
    if (!json.success) {
      toast({ variant: 'destructive', title: 'Could not create segment', description: json.error })
      return
    }
    setCreateDraft(null)
    await loadSegments()
    toast({ title: 'Segment added' })
  }

  const onBlockMove = async (blockId: string, start: Date, end: Date) => {
    const seg = segments.find((s) => s.id === blockId)
    if (!seg) return
    const oldMs = new Date(seg.windowEnd).getTime() - new Date(seg.windowStart).getTime()
    const newMs = end.getTime() - start.getTime()
    /** Timeline move keeps duration; resize changes it (snap is 15m so allow 1ms slack). */
    const isMove = Math.abs(newMs - oldMs) < 2
    let nextHours = seg.hours
    if (!isMove && oldMs > 0) {
      nextHours = roundQuarterHours(seg.hours * (newMs / oldMs))
    }
    const others = scheduledByEstimate.get(seg.jobLaborEstimateId) ?? 0
    const estH = Number(seg.estimate.estimatedHours) || 0
    const maxForSeg = estH - (others - seg.hours) + 1e-6
    nextHours = Math.min(Math.max(0.25, nextHours), maxForSeg)

    const res = await fetch(`/api/jobs/${jobId}/schedule-segments/${blockId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        windowStart: start.toISOString(),
        windowEnd: end.toISOString(),
        hours: isMove ? undefined : nextHours,
      }),
    })
    const json = await res.json()
    if (!json.success) {
      toast({ variant: 'destructive', title: 'Update failed', description: json.error })
      await loadSegments()
      return
    }
    await loadSegments()
  }

  const deleteSegment = async (id: string) => {
    const res = await fetch(`/api/jobs/${jobId}/schedule-segments/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (!json.success) {
      toast({ variant: 'destructive', title: 'Delete failed', description: json.error })
      return
    }
    await loadSegments()
    toast({ title: 'Segment removed' })
  }

  const openHoursEdit = (s: ApiSegment) => {
    const others = scheduledByEstimate.get(s.jobLaborEstimateId) ?? 0
    const estH = Number(s.estimate.estimatedHours) || 0
    const maxHours = estH - (others - s.hours) + 1e-6
    setHoursDraft({ segmentId: s.id, hours: s.hours, maxHours })
    setEditHoursStr(String(s.hours))
  }

  const submitHoursEdit = async () => {
    if (!hoursDraft) return
    const h = Number(editHoursStr)
    if (!Number.isFinite(h) || h <= 0) {
      toast({ variant: 'destructive', title: 'Invalid hours' })
      return
    }
    if (h > hoursDraft.maxHours + 1e-6) {
      toast({
        variant: 'destructive',
        title: 'Too many hours',
        description: `This labor line allows at most ${roundQuarterHours(hoursDraft.maxHours)}h across segments.`,
      })
      return
    }
    const seg = segments.find((s) => s.id === hoursDraft.segmentId)
    if (!seg) return
    const res = await fetch(`/api/jobs/${jobId}/schedule-segments/${hoursDraft.segmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hours: h,
        windowStart: seg.windowStart,
        windowEnd: seg.windowEnd,
      }),
    })
    const json = await res.json()
    if (!json.success) {
      toast({ variant: 'destructive', title: 'Update failed', description: json.error })
      return
    }
    setHoursDraft(null)
    await loadSegments()
    toast({ title: 'Hours updated', description: 'You can drag a new window to place the freed hours elsewhere.' })
  }

  if (estimates.length === 0) {
    return null
  }

  return (
    <Card id="quoted-labor-schedule">
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Quoted labor schedule</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Range</span>
            <Button type="button" size="sm" variant={preset === 'week' ? 'default' : 'outline'} onClick={() => applyPresetClick('week')}>
              Week
            </Button>
            <Button type="button" size="sm" variant={preset === 'month' ? 'default' : 'outline'} onClick={() => applyPresetClick('month')}>
              Month
            </Button>
            <Button type="button" size="sm" variant={preset === 'quarter' ? 'default' : 'outline'} onClick={() => applyPresetClick('quarter')}>
              Quarter
            </Button>
            <Button type="button" size="sm" variant={preset === 'year' ? 'default' : 'outline'} onClick={() => applyPresetClick('year')}>
              Year
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => void loadSegments()} disabled={loading}>
              Refresh
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Drag across a labor row to add a window, then set hours. Drag blocks to move; resize edges to stretch or shrink hours (stays within quoted
          totals). Use “Cut hours” to free capacity and place another segment later.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading && segments.length === 0 ? (
          <div className="text-sm text-muted-foreground">Loading schedule…</div>
        ) : (
          <SchedulingTimeline
            rows={rows}
            blocks={blocks}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            pixelsPerHour={48}
            fitToWidth
            ganttStyle
            onRangeCreate={onRangeCreate}
            onBlockMove={onBlockMove}
            emptyHint="Drag across a row to schedule hours for that labor line."
          />
        )}

        {segments.length > 0 ? (
          <div className="rounded-lg border">
            <div className="border-b bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Segments</div>
            <ul className="divide-y">
              {segments.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                  <div>
                    <span className="font-medium">
                      {s.estimate.laborCode.code} · {s.hours}h
                    </span>
                    <span className="text-muted-foreground">
                      {' '}
                      — {new Date(s.windowStart).toLocaleDateString()} → {new Date(s.windowEnd).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button type="button" size="sm" variant="outline" onClick={() => openHoursEdit(s)}>
                      Cut / set hours
                    </Button>
                    <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => void deleteSegment(s.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>

      <Dialog open={!!createDraft} onOpenChange={(o) => !o && setCreateDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New schedule segment</DialogTitle>
            <DialogDescription>Hours count toward this labor line&apos;s quoted total.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="seg-hours">Hours in this window</Label>
            <Input id="seg-hours" value={createHours} onChange={(e) => setCreateHours(e.target.value)} inputMode="decimal" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateDraft(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitCreate()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!hoursDraft} onOpenChange={(o) => !o && setHoursDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Segment hours</DialogTitle>
            <DialogDescription>Lower hours to free capacity, then add or extend another window on the timeline.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="edit-hours">Hours</Label>
            <Input id="edit-hours" value={editHoursStr} onChange={(e) => setEditHoursStr(e.target.value)} inputMode="decimal" />
            {hoursDraft ? (
              <p className="text-xs text-muted-foreground">Maximum for this segment (quoted line cap): {roundQuarterHours(hoursDraft.maxHours)}h</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setHoursDraft(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitHoursEdit()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
