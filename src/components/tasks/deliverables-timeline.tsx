import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { format, isValid } from 'date-fns'
import { cn } from '@/lib/utils'

type DeliverableLike = {
  id: string
  taskCode: string | null
  taskCodeDescription: string | null
  dueDate: string | null
  estimatedHours: number | null
}

const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000

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

export function DeliverablesTimeline({
  tasks,
  selectedTaskId,
  onSelectTaskId,
}: {
  tasks: DeliverableLike[]
  selectedTaskId: string | null
  onSelectTaskId: (id: string | null) => void
}) {
  const [rangePreset, setRangePreset] = useState<'week' | 'month' | 'quarter' | 'year'>('month')

  const points = useMemo(() => {
    const byGroup = new Map<
      string,
      { id: string; taskCode: string; taskCodeDescription: string; due: Date | null; hours: number }
    >()

    const rows = tasks
      .map((t) => {
        const d = t.dueDate ? new Date(t.dueDate) : null
        return {
          ...t,
          due: d && isValid(d) ? d : null,
          code: (t.taskCode || '').trim(),
          desc: (t.taskCodeDescription || '').trim(),
          hours: Number(t.estimatedHours || 0),
        }
      })
      .filter((t) => !!t.code)

    // Aggregate to high-level groups (first 2 letters of taskCode: PM/AD/SV/etc)
    for (const r of rows) {
      const g = r.code.slice(0, 2).toUpperCase() || '??'
      const cur = byGroup.get(g)
      // Pick a representative underlying task id for selection.
      // Prefer the earliest due date when present; otherwise keep the first seen.
      const shouldReplaceRep =
        !cur ||
        (cur.due == null && r.due != null) ||
        (cur.due != null && r.due != null && r.due.getTime() < cur.due.getTime())
      const repId = shouldReplaceRep ? r.id : cur.id

      const nextDue =
        cur?.due && r.due
          ? (cur.due.getTime() <= r.due.getTime() ? cur.due : r.due)
          : (cur?.due || r.due)
      byGroup.set(g, {
        id: repId,
        taskCode: g,
        taskCodeDescription: g,
        due: nextDue,
        hours: (cur?.hours ?? 0) + r.hours,
      })
    }

    const grouped = Array.from(byGroup.values()).sort((a, b) => {
      const at = a.due ? a.due.getTime() : Number.POSITIVE_INFINITY
      const bt = b.due ? b.due.getTime() : Number.POSITIVE_INFINITY
      if (at !== bt) return at - bt
      return a.taskCode.localeCompare(b.taskCode)
    })

    const sorted = grouped

    const dueDates = sorted.map((r) => r.due).filter(Boolean) as Date[]
    const min = dueDates.length ? new Date(Math.min(...dueDates.map((d) => d.getTime()))) : null
    const max = dueDates.length ? new Date(Math.max(...dueDates.map((d) => d.getTime()))) : null

    return {
      rows: sorted,
      min,
      max,
    }
  }, [tasks])

  const today = useMemo(() => startOfLocalDay(new Date()), [])
  const mid = useMemo(() => {
    if (rangePreset === 'year') return today
    if (points.min && points.max) return new Date((points.min.getTime() + points.max.getTime()) / 2)
    return points.min || points.max || today
  }, [points.min, points.max, rangePreset, today])

  const viewStart = useMemo(() => {
    if (rangePreset === 'year') return new Date(mid.getFullYear(), 0, 1, 0, 0, 0, 0)
    if (rangePreset === 'quarter') return addLocalDays(startOfLocalDay(mid), -45)
    if (rangePreset === 'month') return addLocalDays(startOfLocalDay(mid), -16)
    return addLocalDays(startOfLocalDay(mid), -4)
  }, [rangePreset, mid])

  const viewEnd = useMemo(() => {
    if (rangePreset === 'year') return new Date(mid.getFullYear(), 11, 31, 23, 59, 59, 999)
    if (rangePreset === 'quarter') return addLocalDays(startOfLocalDay(mid), 45)
    if (rangePreset === 'month') return addLocalDays(startOfLocalDay(mid), 16)
    return addLocalDays(startOfLocalDay(mid), 4)
  }, [rangePreset, mid])

  const totalMs = Math.max(viewEnd.getTime() - viewStart.getTime(), HOUR_MS)
  const rangeDays = totalMs / DAY_MS
  const { ref: timelineRef, width: timelineW } = useElementWidth<HTMLDivElement>()
  const timelineWidth = Math.max(1, timelineW || 800)

  const dateToX = useCallback(
    (d: Date) => {
      const t = d.getTime()
      const frac = (t - viewStart.getTime()) / totalMs
      return Math.max(0, Math.min(timelineWidth, frac * timelineWidth))
    },
    [viewStart, totalMs, timelineWidth]
  )

  const isYearLike = rangePreset === 'year' || rangeDays >= 300

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
      const isMajor = d.getDay() === 1
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
    const minPx = rangePreset === 'week' ? 64 : rangePreset === 'month' ? 90 : 120
    const kept: typeof majors = []
    let last = -Infinity
    for (const t of majors) {
      if (t.x - last >= minPx) {
        kept.push(t)
        last = t.x
      }
    }
    return kept
  }, [dayTicks, isYearLike, rangePreset])

  const weekendBands = useMemo(() => {
    if (isYearLike) return []
    if (rangePreset === 'quarter') return []
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
  }, [isYearLike, rangePreset, viewStart, viewEnd, rangeDays, dateToX])

  if (points.rows.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/10 p-3 text-sm text-muted-foreground">
        No deliverables selected yet.
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="px-3 py-2 border-b bg-muted/20 text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 items-center">
        <div className="font-medium text-foreground">Deliverables timeline</div>
        <div>
          Range: {format(viewStart, 'MMM d, yyyy')} → {format(viewEnd, 'MMM d, yyyy')}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={cn('px-2 py-1 rounded border', rangePreset === 'week' ? 'bg-background text-foreground' : 'bg-transparent')}
            onClick={() => setRangePreset('week')}
          >
            Week
          </button>
          <button
            type="button"
            className={cn('px-2 py-1 rounded border', rangePreset === 'month' ? 'bg-background text-foreground' : 'bg-transparent')}
            onClick={() => setRangePreset('month')}
          >
            Month
          </button>
          <button
            type="button"
            className={cn('px-2 py-1 rounded border', rangePreset === 'quarter' ? 'bg-background text-foreground' : 'bg-transparent')}
            onClick={() => setRangePreset('quarter')}
          >
            Quarter
          </button>
          <button
            type="button"
            className={cn('px-2 py-1 rounded border', rangePreset === 'year' ? 'bg-background text-foreground' : 'bg-transparent')}
            onClick={() => setRangePreset('year')}
          >
            Year
          </button>
        </div>
        <button
          type="button"
          className="ml-auto underline text-muted-foreground hover:text-foreground"
          onClick={() => onSelectTaskId(null)}
        >
          Clear selection
        </button>
      </div>

      <div className="p-3 space-y-3">
        <div ref={timelineRef} className="relative rounded-md border overflow-hidden bg-muted/10">
          <div className="h-8 border-b bg-muted/20 relative">
            {isYearLike ? (
              <>
                {yearCols.map((m) => (
                  <div
                    key={m.label}
                    className={cn('absolute top-0 bottom-0 border-r', m.alt ? 'bg-muted/10' : '')}
                    style={{ left: m.left, width: m.width }}
                  />
                ))}
                {yearCols.map((m) => (
                  <div
                    key={`label-${m.label}`}
                    className="absolute top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground"
                    style={{ left: m.mid, transform: 'translate(-50%,-50%)' }}
                  >
                    {m.label}
                  </div>
                ))}
              </>
            ) : (
              <>
                {weekendBands.map((b, idx) => (
                  <div
                    key={`wk-${idx}`}
                    className="absolute top-0 bottom-0 bg-muted/20"
                    style={{ left: b.left, width: b.width }}
                  />
                ))}
                {monthLines.map((m, idx) => (
                  <div key={`ml-${idx}`} className="absolute top-0 bottom-0 border-r border-border/80" style={{ left: m.x }} />
                ))}
                {dayTicks.map((t, idx) => (
                  <div
                    key={`dl-${idx}`}
                    className={cn('absolute top-0 bottom-0 border-r', t.isMajor ? 'border-border/80' : 'border-border/30')}
                    style={{ left: t.x }}
                  />
                ))}
                {majorTickLabels.map((t, idx) => (
                  <div key={`lbl-${idx}`} className="absolute top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground" style={{ left: t.x + 6 }}>
                    {t.label}
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="relative">
            <div className="absolute left-0 right-0 top-0 bottom-0 pointer-events-none">
              {/* grid overlay - already drawn in header; keep row separators */}
            </div>
            {points.rows.map((t) => {
              const isSelected = !!selectedTaskId && t.id === selectedTaskId
              const x = t.due ? dateToX(t.due) : timelineWidth - 8
              return (
                <div key={t.id} className="relative border-t" style={{ height: 44 }}>
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">
                    {t.taskCode}
                  </div>
                  <button
                    type="button"
                    className={cn(
                      'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-7 px-2 rounded-md text-[11px] border shadow-sm flex items-center gap-2',
                      isSelected
                        ? 'bg-purple-700 border-purple-900 text-white'
                        : 'bg-purple-600/90 border-purple-900/80 text-white hover:bg-purple-600'
                    )}
                    style={{ left: x }}
                    onClick={() => onSelectTaskId(t.id)}
                    title={`${t.taskCode}${t.taskCodeDescription ? ` · ${t.taskCodeDescription}` : ''}${t.due ? ` · due ${format(t.due, 'MMM d, yyyy')}` : ''}`}
                  >
                    {t.due ? <span className="opacity-90">{format(t.due, 'MMM d')}</span> : <span className="opacity-70">No date</span>}
                    {t.hours ? <span className="opacity-90 tabular-nums">{t.hours.toFixed(1)}h</span> : null}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {points.rows.slice(0, 6).map((t) => {
            const isSelected = !!selectedTaskId && t.id === selectedTaskId
            return (
              <button
                key={`list-${t.id}`}
                type="button"
                className={cn(
                  'text-left rounded-md border px-3 py-2 hover:bg-muted/15 transition-colors',
                  isSelected ? 'bg-muted/20 border-foreground/20' : 'bg-background'
                )}
                onClick={() => onSelectTaskId(t.id)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-mono truncate">{t.taskCode}</div>
                    <div className="text-xs text-muted-foreground truncate">{t.taskCodeDescription || '—'}</div>
                  </div>
                  <div className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {t.due ? format(t.due, 'yyyy-MM-dd') : 'No date'}
                    {t.hours ? ` · ${t.hours.toFixed(2)}h` : ''}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

