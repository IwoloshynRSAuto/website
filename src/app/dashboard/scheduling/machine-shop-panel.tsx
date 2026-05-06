'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { useToast } from '@/components/ui/use-toast'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { matchesScheduleYearVisibleRange } from '@/lib/schedule-year-strip'
import { roundToNearest15Minutes } from '@/lib/utils/time-rounding'

const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000

const YEAR_GRID_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

function gridStyle(cols: number) {
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
    width: '100%',
    minWidth: 0,
  } as const
}

type PhaseOpt = { id: string; code: string; name: string }

type Assignment = {
  id: string
  jobId: string
  job: { id: string; jobNumber: string; title: string }
  userId: string | null
  user: { id: string; name: string | null; email: string } | null
  plannedStart: string
  plannedEnd: string
  hours: number
  notes: string | null
}

type MachineRow = {
  id: string
  name: string
  sortOrder: number
  phaseCode: PhaseOpt | null
  assignments: Assignment[]
}

type JobOpt = { id: string; jobNumber: string; title: string }

type UserOpt = { id: string; name: string | null; email: string }

function toLocalDatetimeValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function toLocalDateValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function toLocalTimeValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function parseLocalDateTime(date: string, time: string): Date | null {
  const [y, m, d] = String(date || '').split('-').map(Number)
  const [hh, mm] = String(time || '').split(':').map(Number)
  if (!y || !m || !d) return null
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null
  return new Date(y, m - 1, d, hh, mm, 0, 0)
}

function startOfLocalDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function addLocalDays(d: Date, days: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + days)
  return x
}

function startOfLocalWeekSunday(d: Date) {
  const x = new Date(d)
  const day = x.getDay()
  x.setDate(x.getDate() - day)
  x.setHours(0, 0, 0, 0)
  return x
}

function startOfLocalMonth(d: Date) {
  const x = new Date(d)
  x.setDate(1)
  x.setHours(0, 0, 0, 0)
  return x
}

function addLocalMonths(d: Date, months: number) {
  const x = new Date(d)
  x.setMonth(x.getMonth() + months)
  return x
}

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [width, setWidth] = useState<number>(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = Math.floor(entries[0]?.contentRect?.width || 0)
      setWidth(w)
    })
    ro.observe(el)
    setWidth(Math.floor(el.getBoundingClientRect().width || 0))
    return () => ro.disconnect()
  }, [])
  return { ref, width }
}

export function MachineShopPanel({
  rangeStart,
  rangeEnd,
  showBookings = true,
  showMachineManagement = false,
  showTimeline = true,
  pixelsPerDay,
  rangePreset,
  onRangePresetChange,
  density = 'comfortable',
}: {
  rangeStart: Date
  rangeEnd: Date
  showBookings?: boolean
  /** Add/edit/disable machines — use Admin → Machine shop, not the Schedule tab. */
  showMachineManagement?: boolean
  /** Hide the timeline on Admin page (management only). */
  showTimeline?: boolean
  pixelsPerDay: number
  rangePreset?: 'week' | 'month' | 'quarter' | 'year' | 'custom'
  onRangePresetChange?: (preset: 'week' | 'month' | 'quarter' | 'year') => void
  density?: 'compact' | 'comfortable'
}) {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'
  const { toast } = useToast()
  const [machines, setMachines] = useState<MachineRow[]>([])
  const [loading, setLoading] = useState(false)
  const [jobs, setJobs] = useState<JobOpt[]>([])
  const [users, setUsers] = useState<UserOpt[]>([])
  const [phases, setPhases] = useState<PhaseOpt[]>([])
  const [filterUserId, setFilterUserId] = useState<string>('') // '' = all
  const [selectedAssignment, setSelectedAssignment] = useState<{ assignment: Assignment; machineName: string } | null>(
    null
  )

  const [newMachineName, setNewMachineName] = useState('')
  const [newMachinePhaseId, setNewMachinePhaseId] = useState<string>('')

  const [assignMachineId, setAssignMachineId] = useState('')
  const [assignJobId, setAssignJobId] = useState('')
  const [assignUserId, setAssignUserId] = useState('')
  const [assignDate, setAssignDate] = useState(() => toLocalDateValue(new Date()))
  const [assignStartTime, setAssignStartTime] = useState(() => toLocalTimeValue(roundToNearest15Minutes(new Date())))
  const [assignEndTime, setAssignEndTime] = useState(() => toLocalTimeValue(roundToNearest15Minutes(new Date(Date.now() + 4 * HOUR_MS))))
  const [assignHours, setAssignHours] = useState('4')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({
        from: rangeStart.toISOString(),
        to: rangeEnd.toISOString(),
      })
      const res = await fetch(`/api/schedule/shop-machines?${qs}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to load machines')
      setMachines(Array.isArray(json.data?.machines) ? json.data.machines : [])
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not load machine shop',
        description: e instanceof Error ? e.message : 'Error',
      })
      setMachines([])
    } finally {
      setLoading(false)
    }
  }, [rangeStart, rangeEnd, toast])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void (async () => {
      try {
        const [jRes, uRes] = await Promise.all([
          fetch('/api/jobs?schedulePicker=true&limit=400&sortOrder=desc'),
          fetch('/api/users?activeOnly=true'),
        ])
        const jj = await jRes.json()
        const uu = await uRes.json()
        const jArr = Array.isArray(jj.jobs) ? jj.jobs : []
        setJobs(
          jArr
            .filter((j: any) => String(j?.type || 'JOB') === 'JOB' && String(j?.status || '') === 'ACTIVE')
            .map((j: any) => ({ id: String(j.id), jobNumber: String(j.jobNumber || ''), title: String(j.title || '') }))
        )
        const uData = Array.isArray(uu) ? uu : uu?.data
        setUsers(
          Array.isArray(uData)
            ? uData.map((u: any) => ({ id: String(u.id), name: u.name ?? null, email: String(u.email || '') }))
            : []
        )
      } catch {
        setJobs([])
        setUsers([])
      }
    })()
  }, [])

  useEffect(() => {
    if (!isAdmin || !showMachineManagement) {
      setPhases([])
      return
    }
    void (async () => {
      try {
        const res = await fetch('/api/admin/phase-codes')
        const json = await res.json()
        if (!json.success) return
        const arr = Array.isArray(json.data) ? json.data : []
        setPhases(arr.map((p: any) => ({ id: String(p.id), code: String(p.code), name: String(p.name) })))
      } catch {
        setPhases([])
      }
    })()
  }, [isAdmin, showMachineManagement])

  const jobOptions = useMemo(
    () => jobs.map((j) => ({ value: j.id, label: `${j.jobNumber} — ${j.title}`, searchText: `${j.jobNumber} ${j.title}` })),
    [jobs]
  )
  const userOptions = useMemo(
    () => users.map((u) => ({ value: u.id, label: u.name ? `${u.name} — ${u.email}` : u.email, searchText: `${u.name || ''} ${u.email}` })),
    [users]
  )
  const userFilterOptions = useMemo(
    () => [{ value: '', label: 'All operators', searchText: '' }, ...userOptions],
    [userOptions]
  )
  const machineOptions = useMemo(
    () => machines.map((m) => ({ value: m.id, label: m.name, searchText: m.name })),
    [machines]
  )
  const phaseOptions = useMemo(
    () => [{ value: '', label: 'None (name only)', searchText: '' }, ...phases.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}`, searchText: `${p.code} ${p.name}` }))],
    [phases]
  )

  const mid = useMemo(() => new Date((rangeStart.getTime() + rangeEnd.getTime()) / 2), [rangeStart, rangeEnd])
  const viewStart = useMemo(() => {
    if (rangePreset === 'year') return new Date(mid.getFullYear(), 0, 1, 0, 0, 0, 0)
    return rangeStart
  }, [rangePreset, rangeStart, mid])
  const viewEnd = useMemo(() => {
    if (rangePreset === 'year') return new Date(mid.getFullYear(), 11, 31, 23, 59, 59, 999)
    return rangeEnd
  }, [rangePreset, rangeEnd, mid])

  const totalMs = Math.max(viewEnd.getTime() - viewStart.getTime(), HOUR_MS)
  const rangeDays = totalMs / DAY_MS
  const { ref: timelineRef, width: timelineW } = useElementWidth<HTMLDivElement>()
  // For calendar grid modes (Year/Quarter) we compress time to fit width (no horizontal scroll).
  const contentWidth = Math.max(1, timelineW || 1200)
  const dateToFrac = useCallback(
    (d: Date) => {
      const frac = (d.getTime() - viewStart.getTime()) / totalMs
      return Math.max(0, Math.min(1, frac))
    },
    [viewStart, totalMs]
  )

  const dateToX = useCallback(
    (d: Date) => dateToFrac(d) * contentWidth,
    [dateToFrac, contentWidth]
  )

  const rowHeight = density === 'comfortable' ? 44 : 34
  const headerH = 40

  const calendarLabels = useMemo(() => {
    if (rangePreset === 'year') return YEAR_GRID_MONTHS
    if (rangePreset === 'quarter') {
      const q = Math.floor(viewStart.getMonth() / 3)
      return YEAR_GRID_MONTHS.slice(q * 3, q * 3 + 3)
    }
    if (rangePreset === 'month') {
      const w0 = startOfLocalWeekSunday(viewStart)
      return Array.from({ length: 4 }, (_, i) => {
        const ws = addLocalDays(w0, i * 7)
        return ws.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      })
    }
    if (rangePreset === 'week') {
      const d0 = new Date(viewStart)
      return Array.from({ length: 7 }, (_, i) => {
        const d = addLocalDays(d0, i)
        return d.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' })
      })
    }
    if (matchesScheduleYearVisibleRange(rangeStart, rangeEnd)) return YEAR_GRID_MONTHS
    return null
  }, [rangePreset, viewStart, rangeStart, rangeEnd])
  const useCalendarGrid = !!calendarLabels

  const dayTicks = useMemo(() => {
    if (useCalendarGrid) return []
    const rs = viewStart.getTime()
    const re = viewEnd.getTime()
    const first = startOfLocalDay(viewStart)
    const arr: Array<{ x: number; label: string; isMajor: boolean }> = []
    const n = Math.min(Math.ceil(rangeDays) + 2, 800)
    for (let i = 0; i < n; i++) {
      const d = addLocalDays(first, i)
      const t = d.getTime()
      if (t < rs) continue
      if (t > re) break
      const isMajor = d.getDay() === 1 // Monday
      const label = isMajor ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''
      arr.push({ x: dateToX(d), label, isMajor })
    }
    return arr
  }, [useCalendarGrid, viewStart, viewEnd, dateToX, rangeDays])

  const monthLines = useMemo(() => {
    if (useCalendarGrid) return []
    const rs = viewStart.getTime()
    const re = viewEnd.getTime()
    const first = startOfLocalMonth(viewStart)
    const arr: Array<{ x: number; label: string }> = []
    for (let i = 0; i < 24; i++) {
      const m = addLocalMonths(first, i)
      const t = m.getTime()
      if (t < rs) continue
      if (t > re) break
      arr.push({ x: dateToX(m), label: m.toLocaleDateString(undefined, { month: 'short' }) })
    }
    return arr
  }, [useCalendarGrid, viewStart, viewEnd, dateToX])

  const majorTickLabels = useMemo(() => {
    if (useCalendarGrid) return []
    const majors = dayTicks.filter((t) => t.isMajor && t.label)
    const minPx = pixelsPerDay >= 18 ? 72 : pixelsPerDay >= 14 ? 88 : 110
    const kept: typeof majors = []
    let last = -Infinity
    for (const t of majors) {
      if (t.x - last >= minPx) {
        kept.push(t)
        last = t.x
      }
    }
    return kept
  }, [dayTicks, useCalendarGrid, pixelsPerDay])

  const weekendBands = useMemo(() => {
    if (useCalendarGrid) return []
    const rs = viewStart.getTime()
    const re = viewEnd.getTime()
    const first = startOfLocalDay(viewStart)
    const n = Math.min(Math.ceil(rangeDays) + 2, 800)
    const bands: Array<{ left: number; width: number }> = []
    for (let i = 0; i < n; i++) {
      const d0 = addLocalDays(first, i)
      const dow = d0.getDay()
      if (dow !== 0 && dow !== 6) continue
      const d1 = addLocalDays(d0, 1)
      const a = d0.getTime()
      const b = d1.getTime()
      if (b < rs) continue
      if (a > re) break
      const lo = Math.max(a, rs)
      const hi = Math.min(b, re)
      if (hi <= lo) continue
      const left = dateToX(new Date(lo))
      const right = dateToX(new Date(hi))
      const width = Math.max(right - left, 1)
      bands.push({ left, width })
    }
    return bands
  }, [useCalendarGrid, viewStart, viewEnd, rangeDays, dateToX])

  const createMachine = async () => {
    if (!newMachineName.trim()) return
    try {
      const res = await fetch('/api/schedule/shop-machines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newMachineName.trim(),
          phaseCodeId: newMachinePhaseId || null,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not create')
      toast({ title: 'Machine added' })
      setNewMachineName('')
      setNewMachinePhaseId('')
      await load()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Create failed', description: e?.message })
    }
  }

  const patchMachine = async (id: string, patch: { name?: string; phaseCodeId?: string | null; isActive?: boolean }) => {
    try {
      const res = await fetch(`/api/schedule/shop-machines/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) throw new Error(json.error || 'Update failed')
      await load()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Update failed', description: e?.message })
    }
  }

  const deleteMachine = async (id: string) => {
    if (!window.confirm('Delete this machine?')) return
    try {
      const res = await fetch(`/api/schedule/shop-machines/${id}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) throw new Error(json.error || 'Delete failed')
      toast({ title: 'Machine deleted' })
      await load()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Delete failed', description: e?.message })
    }
  }

  const submitAssignment = async () => {
    if (!assignMachineId || !assignJobId) {
      toast({ variant: 'destructive', title: 'Pick machine and job' })
      return
    }
    const rawS = parseLocalDateTime(assignDate, assignStartTime)
    const rawE = parseLocalDateTime(assignDate, assignEndTime)
    if (!rawS || !rawE) {
      toast({ variant: 'destructive', title: 'Pick a date, start, and end time' })
      return
    }
    const s = roundToNearest15Minutes(rawS)
    const e = roundToNearest15Minutes(rawE)
    if (!(e.getTime() > s.getTime())) {
      toast({ variant: 'destructive', title: 'End must be after start' })
      return
    }
    // Keep UI in sync with rounding.
    setAssignDate(toLocalDateValue(s))
    setAssignStartTime(toLocalTimeValue(s))
    setAssignEndTime(toLocalTimeValue(e))
    const h = Number(assignHours)
    try {
      const res = await fetch('/api/schedule/machine-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopMachineId: assignMachineId,
          jobId: assignJobId,
          userId: assignUserId || null,
          plannedStart: s.toISOString(),
          plannedEnd: e.toISOString(),
          hours: Number.isFinite(h) && h > 0 ? h : undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not save')
      toast({ title: 'Assignment saved' })
      await load()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Save failed', description: e?.message })
    }
  }

  const deleteAssignment = async (id: string) => {
    if (!window.confirm('Remove this machine assignment?')) return
    try {
      const res = await fetch(`/api/schedule/machine-assignments/${id}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) throw new Error(json.error || 'Delete failed')
      toast({ title: 'Removed' })
      await load()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Delete failed', description: e?.message })
    }
  }

  return (
    <div className="space-y-4">
      {showMachineManagement && isAdmin ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Machines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-full sm:w-56">
                <Label className="text-xs">Name</Label>
                <Input value={newMachineName} onChange={(e) => setNewMachineName(e.target.value)} placeholder="e.g. Haas VF-2" />
              </div>
              <div className="w-full sm:w-64">
                <Label className="text-xs">Phase label (optional)</Label>
                <SearchableSelect
                  options={phaseOptions}
                  value={newMachinePhaseId}
                  onValueChange={setNewMachinePhaseId}
                  placeholder="Phase code…"
                  emptyMessage="No codes"
                  dense
                  className="w-full"
                />
              </div>
              <Button type="button" onClick={() => void createMachine()} disabled={!newMachineName.trim()}>
                Add
              </Button>
            </div>

            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Machine</TableHead>
                    <TableHead className="min-w-[220px]">Phase label</TableHead>
                    <TableHead className="w-[160px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {machines.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="align-top">
                        <Input
                          defaultValue={m.name}
                          className="h-9"
                          onBlur={(e) => {
                            const next = e.target.value.trim()
                            if (next && next !== m.name) void patchMachine(m.id, { name: next })
                          }}
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <SearchableSelect
                          options={phaseOptions}
                          value={m.phaseCode?.id || ''}
                          onValueChange={(v) => void patchMachine(m.id, { phaseCodeId: v || null })}
                          placeholder="None"
                          emptyMessage="No codes"
                          dense
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex justify-end gap-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => void patchMachine(m.id, { isActive: false })}>
                            Disable
                          </Button>
                          <Button type="button" size="sm" variant="destructive" onClick={() => void deleteMachine(m.id)}>
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {machines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                        No machines.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {showBookings ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Book machine time</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-12 items-end">
            <div className="sm:col-span-3">
              <Label className="text-xs">Machine</Label>
              <SearchableSelect
                options={machineOptions}
                value={assignMachineId}
                onValueChange={setAssignMachineId}
                placeholder="Select…"
                emptyMessage={machines.length ? 'No match' : 'Configure machines under Admin → Machine shop'}
                dense
                className="w-full"
              />
            </div>
            <div className="sm:col-span-4">
              <Label className="text-xs">Job</Label>
              <SearchableSelect
                options={jobOptions}
                value={assignJobId}
                onValueChange={setAssignJobId}
                placeholder="Active job…"
                emptyMessage="No jobs"
                dense
                className="w-full"
              />
            </div>
            <div className="sm:col-span-3">
              <Label className="text-xs">Operator (optional)</Label>
              <SearchableSelect
                options={userOptions}
                value={assignUserId}
                onValueChange={setAssignUserId}
                placeholder="Anyone"
                emptyMessage="No users"
                dense
                className="w-full"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Date</Label>
              <Input type="date" value={assignDate} onChange={(e) => setAssignDate(e.target.value)} className="h-9 w-full" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Start</Label>
              <Input
                type="time"
                step={900}
                value={assignStartTime}
                onChange={(e) => setAssignStartTime(e.target.value)}
                className="h-9 w-full"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">End</Label>
              <Input type="time" step={900} value={assignEndTime} onChange={(e) => setAssignEndTime(e.target.value)} className="h-9 w-full" />
            </div>
            <div className="sm:col-span-1">
              <Label className="text-xs">Hours</Label>
              <Input value={assignHours} onChange={(e) => setAssignHours(e.target.value)} inputMode="decimal" className="h-9" />
            </div>
            <div className="sm:col-span-12 flex justify-end">
              <Button type="button" onClick={() => void submitAssignment()}>
                Save booking
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {showTimeline ? <Card>
        <CardHeader className="flex flex-row flex-wrap justify-between items-center gap-2 pb-2">
          <CardTitle className="text-base">Machine timeline</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {onRangePresetChange ? (
              <div className="flex rounded-md border bg-background overflow-hidden">
                <Button
                  type="button"
                  size="sm"
                  className="rounded-none h-8"
                  variant={rangePreset === 'week' ? 'default' : 'ghost'}
                  onClick={() => onRangePresetChange('week')}
                >
                  Week
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-none h-8"
                  variant={rangePreset === 'month' ? 'default' : 'ghost'}
                  onClick={() => onRangePresetChange('month')}
                >
                  Month
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-none h-8"
                  variant={rangePreset === 'quarter' ? 'default' : 'ghost'}
                  onClick={() => onRangePresetChange('quarter')}
                >
                  Quarter
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-none h-8"
                  variant={rangePreset === 'year' ? 'default' : 'ghost'}
                  onClick={() => onRangePresetChange('year')}
                >
                  Year
                </Button>
              </div>
            ) : null}
            <div className="w-[260px]">
              <SearchableSelect
                options={userFilterOptions}
                value={filterUserId}
                onValueChange={setFilterUserId}
                placeholder="Filter operator…"
                emptyMessage="No users"
                dense
                className="w-full"
              />
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && machines.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>
          ) : machines.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No machines yet. Admins add and edit machines under Admin → Machine shop; then book time here on Schedule.
            </div>
          ) : (
            <div className="flex rounded-lg border bg-card">
              <div className="shrink-0 w-48 min-w-[12rem] border-r bg-muted/40">
                <div className="h-10 border-b flex items-center px-2 text-xs font-semibold uppercase text-muted-foreground">Machine</div>
                {machines.map((m) => (
                  <div key={m.id} className="border-b px-2 text-sm flex flex-col justify-center" style={{ height: rowHeight }}>
                    <span className="font-medium truncate">{m.name}</span>
                    {m.phaseCode ? (
                      <span className="text-[10px] text-muted-foreground font-mono truncate">{m.phaseCode.code}</span>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="flex-1 min-w-0 overflow-x-hidden">
                <div ref={timelineRef} className="relative w-full min-w-0">
                  <div
                    className={
                      useCalendarGrid
                        ? 'min-h-10 min-w-0 border-b bg-muted/20 text-[10px] text-muted-foreground [&>*]:min-w-0'
                        : 'relative h-10 border-b bg-muted/20 text-[10px] text-muted-foreground w-full min-w-0'
                    }
                    style={useCalendarGrid && calendarLabels ? gridStyle(calendarLabels.length) : undefined}
                  >
                    {useCalendarGrid && calendarLabels
                      ? calendarLabels.map((label, i) => (
                          <div
                            key={label}
                            className={cn(
                              'relative flex items-start justify-center pt-1 border-r border-foreground/20',
                              i % 2 === 1 ? 'bg-muted/30' : ''
                            )}
                          >
                            <span className="font-medium whitespace-nowrap">{label}</span>
                          </div>
                        ))
                      : null}
                    {dayTicks.map((t, i) => (
                          <div
                            key={`mtick-${i}`}
                            className={`absolute top-0 bottom-0 w-px pointer-events-none ${
                              t.isMajor ? 'bg-foreground/20' : 'bg-foreground/10'
                            }`}
                            style={{ left: t.x }}
                          />
                        ))}
                    {monthLines.map((m, i) => (
                          <div
                            key={`mmline-h-${i}`}
                            className="absolute top-0 bottom-0 w-[2px] bg-foreground/30 pointer-events-none z-[4]"
                            style={{ left: m.x }}
                          />
                        ))}
                    {majorTickLabels.map((t, i) => (
                          <div
                            key={`mticklbl-${i}`}
                            className="absolute top-1 text-[10px] text-muted-foreground whitespace-nowrap pointer-events-none"
                            style={{ left: t.x + 4 }}
                          >
                            {t.label}
                          </div>
                        ))}
                  </div>
                  {machines.map((m) => (
                    <div key={m.id} className="relative border-b bg-background" style={{ height: rowHeight, width: '100%' }}>
                      {weekendBands.map((w, i) => (
                            <div
                              key={`${m.id}-wknd-${i}`}
                              className="absolute top-0 bottom-0 bg-muted/20 pointer-events-none"
                              style={{ left: w.left, width: w.width }}
                            />
                          ))}
                      {monthLines.map((ml, i) => (
                            <div
                              key={`${m.id}-mline-${i}`}
                              className="absolute top-0 bottom-0 w-[2px] bg-foreground/30 pointer-events-none z-[4]"
                              style={{ left: ml.x }}
                            />
                          ))}
                      {useCalendarGrid && calendarLabels ? (
                        <div className="absolute inset-0 z-0 pointer-events-none [&>*]:min-w-0" style={gridStyle(calendarLabels.length)}>
                          {calendarLabels.map((label, i) => (
                            <div key={`${m.id}-cg-${label}`} className={cn('border-r border-foreground/10', i % 2 === 1 ? 'bg-muted/10' : '')} />
                          ))}
                        </div>
                      ) : null}
                      {dayTicks.map((t, i) => (
                        <div
                          key={`${m.id}-grid-${i}`}
                          className={`absolute top-0 bottom-0 pointer-events-none ${
                            t.isMajor ? 'w-[2px] bg-foreground/25 z-[3]' : 'w-px bg-foreground/10'
                          }`}
                          style={{ left: t.x }}
                        />
                      ))}
                      {m.assignments
                        .filter((a) => (filterUserId ? a.userId === filterUserId : true))
                        .map((a) => {
                        const lo = Math.max(new Date(a.plannedStart).getTime(), rangeStart.getTime())
                        const hi = Math.min(new Date(a.plannedEnd).getTime(), rangeEnd.getTime())
                        if (hi <= lo) return null
                        const vs = viewStart.getTime()
                        const lf = Math.max(0, Math.min(1, (lo - vs) / totalMs))
                        const rf = Math.max(0, Math.min(1, (hi - vs) / totalMs))
                        const posStyle = useCalendarGrid
                          ? { left: `${lf * 100}%`, width: `${Math.max(rf - lf, 0.003) * 100}%` }
                          : (() => {
                              const left = dateToX(new Date(lo))
                              const right = dateToX(new Date(hi))
                              const w = Math.max(right - left, 2)
                              return { left, width: w }
                            })()
                        const who = a.user?.name || a.user?.email || 'Unassigned'
                        return (
                          <div
                            key={a.id}
                            className="group absolute top-1 bottom-1 rounded border bg-amber-600/90 border-amber-900 text-white text-[10px] px-1 flex items-center justify-between gap-1 overflow-hidden shadow-sm"
                            style={posStyle}
                            title={`${a.job.jobNumber} · ${who}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedAssignment({ assignment: a, machineName: m.name })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') setSelectedAssignment({ assignment: a, machineName: m.name })
                            }}
                          >
                            <div className="min-w-0">
                              <div className="truncate font-medium leading-4">{a.job.jobNumber}</div>
                              <div className="truncate text-white/90 leading-4">{who}</div>
                            </div>
                            <button
                              type="button"
                              className="shrink-0 text-white/90 hover:text-white text-xs underline opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation()
                                void deleteAssignment(a.id)
                              }}
                            >
                              ×
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card> : null}

      <Dialog open={!!selectedAssignment} onOpenChange={(o) => !o && setSelectedAssignment(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Machine booking</DialogTitle>
            <DialogDescription>
              {selectedAssignment
                ? `${selectedAssignment.machineName} · ${selectedAssignment.assignment.job.jobNumber} — ${selectedAssignment.assignment.job.title}`
                : ''}
            </DialogDescription>
          </DialogHeader>
          {selectedAssignment ? (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <div className="text-muted-foreground">Machine</div>
                <div className="col-span-2 font-medium">{selectedAssignment.machineName}</div>
                <div className="text-muted-foreground">Operator</div>
                <div className="col-span-2">
                  {selectedAssignment.assignment.user?.name || selectedAssignment.assignment.user?.email || 'Unassigned'}
                </div>
                <div className="text-muted-foreground">Start</div>
                <div className="col-span-2">{new Date(selectedAssignment.assignment.plannedStart).toLocaleString()}</div>
                <div className="text-muted-foreground">End</div>
                <div className="col-span-2">{new Date(selectedAssignment.assignment.plannedEnd).toLocaleString()}</div>
                <div className="text-muted-foreground">Duration</div>
                <div className="col-span-2 tabular-nums">
                  {(
                    (new Date(selectedAssignment.assignment.plannedEnd).getTime() -
                      new Date(selectedAssignment.assignment.plannedStart).getTime()) /
                    HOUR_MS
                  ).toFixed(2)}{' '}
                  h (calendar) · booked {selectedAssignment.assignment.hours.toFixed(2)} h
                </div>
                {selectedAssignment.assignment.notes ? (
                  <>
                    <div className="text-muted-foreground">Notes</div>
                    <div className="col-span-2 whitespace-pre-wrap">{selectedAssignment.assignment.notes}</div>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
          <DialogFooter className="flex flex-row justify-between sm:justify-between">
            {selectedAssignment ? (
              <Button asChild variant="outline">
                <Link href={`/dashboard/jobs/${selectedAssignment.assignment.jobId}`}>Open job</Link>
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setSelectedAssignment(null)}>
                Close
              </Button>
              {selectedAssignment ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    const id = selectedAssignment.assignment.id
                    setSelectedAssignment(null)
                    void deleteAssignment(id)
                  }}
                >
                  Delete
                </Button>
              ) : null}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
