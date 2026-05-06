'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { matchesScheduleYearVisibleRange } from '@/lib/schedule-year-strip'

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

type DeliverableM = { id: string; name: string; dueDate: string; status: string }

type ActiveJobRow = {
  id: string
  jobNumber: string
  title: string
  startDate: string
  endDate: string
  quotedHours: number
  actualHours: number
  hoursRemaining: number
  deliverables: DeliverableM[]
}

function toLocalDatetimeValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function parseLocalDatetimeValue(s: string) {
  const [datePart, timePart] = s.split('T')
  if (!datePart || !timePart) return null
  const [y, mo, da] = datePart.split('-').map(Number)
  const [h, mi] = timePart.split(':').map(Number)
  if (!y || !mo || !da) return null
  return new Date(y, mo - 1, da, h || 0, mi || 0, 0, 0)
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

export function ActiveJobsPanel({
  rangeStart,
  rangeEnd,
  pixelsPerDay,
  rangePreset,
  jobSearch = '',
  density = 'comfortable',
}: {
  rangeStart: Date
  rangeEnd: Date
  pixelsPerDay: number
  rangePreset?: 'week' | 'month' | 'quarter' | 'year' | 'custom'
  jobSearch?: string
  density?: 'compact' | 'comfortable'
}) {
  const { toast } = useToast()
  const [jobs, setJobs] = useState<ActiveJobRow[]>([])
  const [loading, setLoading] = useState(false)
  const [editJob, setEditJob] = useState<ActiveJobRow | null>(null)
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [saving, setSaving] = useState(false)

  const normJobSearch = jobSearch.trim().toLowerCase()
  const visibleJobs = useMemo(() => {
    if (!normJobSearch) return jobs
    return jobs.filter((j) => {
      const num = String(j.jobNumber || '').toLowerCase()
      const title = String(j.title || '').toLowerCase()
      return num.includes(normJobSearch) || title.includes(normJobSearch)
    })
  }, [jobs, normJobSearch])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({
        from: rangeStart.toISOString(),
        to: rangeEnd.toISOString(),
      })
      const res = await fetch(`/api/schedule/active-jobs?${qs}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to load')
      setJobs(Array.isArray(json.data?.jobs) ? json.data.jobs : [])
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not load active jobs',
        description: e instanceof Error ? e.message : 'Error',
      })
      setJobs([])
    } finally {
      setLoading(false)
    }
  }, [rangeStart, rangeEnd, toast])

  useEffect(() => {
    void load()
  }, [load])

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

  const dateToX = useCallback((d: Date) => dateToFrac(d) * contentWidth, [dateToFrac, contentWidth])

  const rowHeight = density === 'comfortable' ? 56 : 40
  const headerH = 44

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
    // If user edits From/To but still equals calendar-year bounds, keep the year strip.
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
    // Only draw weekend shading for ranges where it helps (week/month/quarter).
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

  const bars = useMemo(() => {
    return visibleJobs.map((j) => {
      const a = new Date(j.startDate).getTime()
      const b = new Date(j.endDate).getTime()
      const rs = rangeStart.getTime()
      const re = rangeEnd.getTime()
      const lo = Math.max(a, rs)
      const hi = Math.min(b, re)
      if (hi <= lo) {
        return {
          job: j,
          visible: false as const,
          left: 0,
          width: 0,
          markers: [] as { left: number | string; label: string }[],
        }
      }

      const vs = viewStart.getTime()
      const lf = Math.max(0, Math.min(1, (lo - vs) / totalMs))
      const rf = Math.max(0, Math.min(1, (hi - vs) / totalMs))

      const markers = j.deliverables
        .map((d) => {
          const dt = new Date(d.dueDate).getTime()
          if (dt < rs || dt > re) return null
          if (useCalendarGrid) {
            const mf = Math.max(0, Math.min(1, (dt - vs) / totalMs))
            return { left: `${mf * 100}%`, label: d.name }
          }
          return { left: dateToX(new Date(d.dueDate)), label: d.name }
        })
        .filter(Boolean) as { left: number | string; label: string }[]

      if (useCalendarGrid) {
        return {
          job: j,
          visible: true as const,
          left: `${lf * 100}%`,
          width: `${Math.max(rf - lf, 0.003) * 100}%`,
          markers,
        }
      }

      const left = dateToX(new Date(lo))
      const right = dateToX(new Date(hi))
      const width = Math.max(right - left, 4)
      return { job: j, visible: true as const, left, width, markers }
    })
  }, [visibleJobs, rangeStart, rangeEnd, viewStart, totalMs, dateToX, useCalendarGrid])

  const saveDates = async () => {
    if (!editJob) return
    const s = parseLocalDatetimeValue(editStart)
    const e = parseLocalDatetimeValue(editEnd)
    if (!s || !e || e.getTime() <= s.getTime()) {
      toast({ variant: 'destructive', title: 'Invalid dates', description: 'End must be after start.' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/jobs/${editJob.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: s.toISOString(), endDate: e.toISOString() }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((json as { error?: string })?.error || 'Update failed (need job owner or admin)')
      toast({ title: 'Job dates updated' })
      setEditJob(null)
      await load()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Could not update job',
        description: err instanceof Error ? err.message : 'Error',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
          <div>
            <CardTitle className="text-base">Active jobs</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Bars use each job&apos;s start and target end. Purple ticks are deliverable due dates. Hours left = quoted labor minus time entered on the
              job.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
              Refresh
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/jobs">Jobs</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && jobs.length === 0 ? (
            <div className="text-sm text-muted-foreground py-10 text-center">Loading…</div>
          ) : visibleJobs.length === 0 ? (
            <div className="text-sm text-muted-foreground py-10 text-center">
              {jobs.length === 0 ? 'No active jobs found.' : 'No jobs match your search.'}
            </div>
          ) : (
            <div className="flex rounded-lg border bg-card">
              <div className={`shrink-0 border-r bg-muted/40 ${density === 'comfortable' ? 'w-[26rem] min-w-[26rem]' : 'w-80 min-w-[20rem]'}`}>
                <div className="h-11 min-h-[44px] border-b flex items-center px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Job
                </div>
                {visibleJobs.map((j) => (
                  <div
                    key={j.id}
                    className="border-b flex flex-col justify-center px-3 text-sm"
                    style={{ height: rowHeight }}
                  >
                    <div className="font-medium truncate" title={j.jobNumber}>
                      {j.jobNumber}
                    </div>
                    <div
                      className={`text-[11px] text-muted-foreground leading-4 whitespace-normal break-words overflow-hidden ${
                        density === 'comfortable' ? 'max-h-[2.6rem]' : 'max-h-[1.25rem]'
                      }`}
                      title={j.title}
                    >
                      {j.title}
                    </div>
                    {density === 'comfortable' ? (
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {j.hoursRemaining.toFixed(1)}h left · {j.actualHours.toFixed(1)}h actual / {j.quotedHours.toFixed(1)}h quoted
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="flex-1 min-w-0 overflow-x-hidden">
                <div ref={timelineRef} className="relative w-full min-w-0">
                  <div
                    className={
                      useCalendarGrid
                        ? 'border-b bg-muted/20 h-11 text-[10px] text-muted-foreground [&>*]:min-w-0'
                        : 'relative border-b bg-muted/20 h-11 text-[10px] text-muted-foreground w-full min-w-0'
                    }
                    style={useCalendarGrid && calendarLabels ? gridStyle(calendarLabels.length) : { width: '100%' }}
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
                            key={`tick-${i}`}
                            className={`absolute top-0 bottom-0 w-px pointer-events-none ${
                              t.isMajor ? 'bg-foreground/20' : 'bg-foreground/10'
                            }`}
                            style={{ left: t.x }}
                          />
                        ))}
                    {monthLines.map((m, i) => (
                          <div
                            key={`mline-h-${i}`}
                            className="absolute top-0 bottom-0 w-[2px] bg-foreground/30 pointer-events-none z-[4]"
                            style={{ left: m.x }}
                          />
                        ))}
                    {majorTickLabels.map((t, i) => (
                          <div
                            key={`ticklbl-${i}`}
                            className="absolute top-1 text-[10px] text-muted-foreground whitespace-nowrap pointer-events-none"
                            style={{ left: t.x + 4 }}
                          >
                            {t.label}
                          </div>
                        ))}
                  </div>
                  {bars.map((b) => (
                    <div
                      key={b.job.id}
                      className="relative border-b bg-background"
                      style={{ height: rowHeight, width: '100%' }}
                    >
                      {weekendBands.map((w, i) => (
                            <div
                              key={`${b.job.id}-wknd-${i}`}
                              className="absolute top-0 bottom-0 bg-muted/20 pointer-events-none"
                              style={{ left: w.left, width: w.width }}
                            />
                          ))}
                      {monthLines.map((m, i) => (
                            <div
                              key={`${b.job.id}-mline-${i}`}
                              className="absolute top-0 bottom-0 w-[2px] bg-foreground/30 pointer-events-none z-[4]"
                              style={{ left: m.x }}
                            />
                          ))}
                      {useCalendarGrid && calendarLabels ? (
                        <div className="absolute inset-0 z-0 pointer-events-none [&>*]:min-w-0" style={gridStyle(calendarLabels.length)}>
                          {calendarLabels.map((label, i) => (
                            <div key={`${b.job.id}-cg-${label}`} className={cn('border-r border-foreground/10', i % 2 === 1 ? 'bg-muted/10' : '')} />
                          ))}
                        </div>
                      ) : null}
                      {dayTicks.map((t, i) => (
                            <div
                              key={`${b.job.id}-grid-${i}`}
                              className={`absolute top-0 bottom-0 pointer-events-none ${
                                t.isMajor ? 'w-[2px] bg-foreground/25 z-[3]' : 'w-px bg-foreground/10'
                              }`}
                              style={{ left: t.x }}
                            />
                          ))}
                      {b.markers.map((m, i) => (
                        <div
                          key={`${b.job.id}-m-${i}`}
                          className="absolute top-0 bottom-0 z-[2] w-px bg-violet-500 pointer-events-none"
                          style={{ left: m.left }}
                          title={`${m.label} (due)`}
                        />
                      ))}
                      {b.visible ? (
                        <Link
                          href={`/dashboard/jobs/${b.job.id}`}
                          className="absolute top-1.5 bottom-1.5 rounded-md bg-sky-600/90 border border-sky-800 text-left text-white px-2 text-[11px] shadow-sm hover:bg-sky-600 z-[1] min-w-[4px] flex items-center"
                          style={{ left: b.left, width: b.width }}
                          title={`${b.job.jobNumber} — ${b.job.title}`}
                        >
                          <div className="min-w-0 leading-4">
                            <div className="truncate font-semibold">{b.job.jobNumber}</div>
                            <div className="truncate text-white/90">{b.job.title}</div>
                          </div>
                        </Link>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editJob} onOpenChange={(o) => !o && setEditJob(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Job timeline</DialogTitle>
            <DialogDescription>{editJob ? `${editJob.jobNumber} — ${editJob.title}` : ''}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="aj-start">Start</Label>
              <Input id="aj-start" type="datetime-local" value={editStart} onChange={(e) => setEditStart(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="aj-end">Target end</Label>
              <Input id="aj-end" type="datetime-local" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditJob(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void saveDates()} disabled={saving}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
