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

const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000

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
  density = 'comfortable',
}: {
  rangeStart: Date
  rangeEnd: Date
  pixelsPerDay: number
  rangePreset?: 'week' | 'month' | 'quarter' | 'year' | 'custom'
  density?: 'compact' | 'comfortable'
}) {
  const { toast } = useToast()
  const [jobs, setJobs] = useState<ActiveJobRow[]>([])
  const [loading, setLoading] = useState(false)
  const [editJob, setEditJob] = useState<ActiveJobRow | null>(null)
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [saving, setSaving] = useState(false)

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
  // Prevent “everything at x=0” during first paint / resize glitches.
  const timelineWidth = Math.max(1, timelineW || 1200)

  const dateToX = useCallback(
    (d: Date) => {
      const t = d.getTime()
      const frac = (t - viewStart.getTime()) / totalMs
      return Math.max(0, Math.min(timelineWidth, frac * timelineWidth))
    },
    [viewStart, totalMs, timelineWidth]
  )

  const rowHeight = density === 'comfortable' ? 56 : 40
  const headerH = 44

  const isYearLike = rangePreset === 'year' || rangeDays >= 300 || pixelsPerDay <= 7

  const yearCols = useMemo(() => {
    if (rangePreset !== 'year') return []
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const w = timelineWidth / 12
    return months.map((label, i) => ({
      left: i * w,
      width: w,
      mid: (i + 0.5) * w,
      label,
      alt: i % 2 === 1,
    }))
  }, [rangePreset, timelineWidth])

  const dayTicks = useMemo(() => {
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
  }, [viewStart, viewEnd, dateToX, rangeDays])

  const monthLines = useMemo(() => {
    if (isYearLike) return []
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
  }, [isYearLike, viewStart, viewEnd, dateToX])

  const majorTickLabels = useMemo(() => {
    if (isYearLike) return []
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
  }, [dayTicks, isYearLike, pixelsPerDay])

  const weekendBands = useMemo(() => {
    if (isYearLike) return []
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
  }, [isYearLike, viewStart, viewEnd, rangeDays, dateToX])

  const monthBands = useMemo(() => {
    if (!isYearLike) return []
    if (rangePreset === 'year') return yearCols
    const rs = viewStart.getTime()
    const re = viewEnd.getTime()
    const year = mid.getFullYear()
    const first = rangePreset === 'year' ? new Date(year, 0, 1, 0, 0, 0, 0) : startOfLocalMonth(viewStart)
    const arr: Array<{ left: number; width: number; mid: number; label: string; alt: boolean }> = []
    const maxMonths = rangePreset === 'year' ? 12 : 24
    for (let i = 0; i < maxMonths; i++) {
      const m0 = addLocalMonths(first, i)
      const m1 = addLocalMonths(first, i + 1)
      const a = m0.getTime()
      const b = m1.getTime()
      if (b < rs) continue
      if (a > re) break
      const lo = Math.max(a, rs)
      const hi = Math.min(b, re)
      if (hi <= lo) continue
      const left = dateToX(new Date(lo))
      const right = dateToX(new Date(hi))
      const width = Math.max(right - left, 1)
      const label = m0.toLocaleDateString(undefined, { month: 'short' })
      arr.push({ left, width, mid: left + width / 2, label, alt: i % 2 === 1 })
    }
    return arr
  }, [isYearLike, viewStart, viewEnd, dateToX, rangePreset, mid, yearCols])

  const monthLabelPositions = useMemo(() => {
    if (!isYearLike) return []
    const pad = 18
    return monthBands.map((m) => ({
      ...m,
      x: Math.max(pad, Math.min(timelineWidth - pad, m.mid)),
    }))
  }, [isYearLike, monthBands, timelineWidth])

  const bars = useMemo(() => {
    return jobs.map((j) => {
      const a = new Date(j.startDate).getTime()
      const b = new Date(j.endDate).getTime()
      const rs = rangeStart.getTime()
      const re = rangeEnd.getTime()
      const lo = Math.max(a, rs)
      const hi = Math.min(b, re)
      if (hi <= lo) return { job: j, left: 0, width: 0, markers: [] as { x: number; label: string }[] }
      const left = dateToX(new Date(lo))
      const right = dateToX(new Date(hi))
      const width = Math.max(right - left, 4)
      const markers = j.deliverables
        .map((d) => {
          const dt = new Date(d.dueDate).getTime()
          if (dt < rs || dt > re) return null
          return { x: dateToX(new Date(d.dueDate)), label: d.name }
        })
        .filter(Boolean) as { x: number; label: string }[]
      return { job: j, left, width, markers }
    })
  }, [jobs, rangeStart, rangeEnd, dateToX])

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
          ) : jobs.length === 0 ? (
            <div className="text-sm text-muted-foreground py-10 text-center">No active jobs found.</div>
          ) : (
            <div className="flex rounded-lg border bg-card overflow-hidden">
              <div className={`shrink-0 border-r bg-muted/40 ${density === 'comfortable' ? 'w-[26rem] min-w-[26rem]' : 'w-80 min-w-[20rem]'}`}>
                <div className="h-11 min-h-[44px] border-b flex items-center px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Job
                </div>
                {jobs.map((j) => (
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
              <div className="flex-1 overflow-x-hidden">
                <div ref={timelineRef} className="relative w-full">
                  <div
                    className="relative border-b bg-muted/20 h-11 text-[10px] text-muted-foreground"
                    style={{ width: '100%' }}
                  >
                    {isYearLike
                      ? monthBands.map((m, i) => (
                          <div key={`mb-h-${i}`} className="absolute top-0 bottom-0 pointer-events-none" style={{ left: m.left, width: m.width }}>
                            <div className={`absolute inset-0 ${m.alt ? 'bg-muted/30' : 'bg-transparent'}`} />
                            <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-foreground/35" />
                            <div className="absolute top-0 bottom-0 right-0 w-[2px] bg-foreground/20" />
                          </div>
                        ))
                      : dayTicks.map((t, i) => (
                          <div
                            key={`tick-${i}`}
                            className={`absolute top-0 bottom-0 w-px pointer-events-none ${
                              t.isMajor ? 'bg-foreground/20' : 'bg-foreground/10'
                            }`}
                            style={{ left: t.x }}
                          />
                        ))}
                    {!isYearLike
                      ? monthLines.map((m, i) => (
                          <div
                            key={`mline-h-${i}`}
                            className="absolute top-0 bottom-0 w-[2px] bg-foreground/30 pointer-events-none z-[4]"
                            style={{ left: m.x }}
                          />
                        ))
                      : null}
                    {isYearLike
                      ? monthLabelPositions.map((m, i) => (
                          <div
                            key={`mb-lbl-${i}`}
                            className="absolute top-1 text-[10px] font-medium text-muted-foreground whitespace-nowrap pointer-events-none"
                            style={{ left: m.x, transform: 'translateX(-50%)' }}
                          >
                            {m.label}
                          </div>
                        ))
                      : null}
                    {!isYearLike
                      ? majorTickLabels.map((t, i) => (
                          <div
                            key={`ticklbl-${i}`}
                            className="absolute top-1 text-[10px] text-muted-foreground whitespace-nowrap pointer-events-none"
                            style={{ left: t.x + 4 }}
                          >
                            {t.label}
                          </div>
                        ))
                      : null}
                  </div>
                  {bars.map((b) => (
                    <div
                      key={b.job.id}
                      className="relative border-b bg-background"
                      style={{ height: rowHeight, width: '100%' }}
                    >
                      {!isYearLike
                        ? weekendBands.map((w, i) => (
                            <div
                              key={`${b.job.id}-wknd-${i}`}
                              className="absolute top-0 bottom-0 bg-muted/20 pointer-events-none"
                              style={{ left: w.left, width: w.width }}
                            />
                          ))
                        : null}
                      {!isYearLike
                        ? monthLines.map((m, i) => (
                            <div
                              key={`${b.job.id}-mline-${i}`}
                              className="absolute top-0 bottom-0 w-[2px] bg-foreground/30 pointer-events-none z-[4]"
                              style={{ left: m.x }}
                            />
                          ))
                        : null}
                      {isYearLike
                        ? monthBands.map((m, i) => (
                            <div key={`${b.job.id}-mb-${i}`} className="absolute top-0 bottom-0 pointer-events-none" style={{ left: m.left, width: m.width }}>
                              <div className={`absolute inset-0 ${m.alt ? 'bg-muted/10' : 'bg-transparent'}`} />
                              <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-foreground/20" />
                              <div className="absolute top-0 bottom-0 right-0 w-[2px] bg-foreground/10" />
                            </div>
                          ))
                        : dayTicks.map((t, i) => (
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
                          style={{ left: m.x }}
                          title={`${m.label} (due)`}
                        />
                      ))}
                      {b.width > 0 ? (
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
