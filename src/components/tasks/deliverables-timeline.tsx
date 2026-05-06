import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { format, isValid } from 'date-fns'
import { cn } from '@/lib/utils'
import { sameLocalCalendarDay, TWELVE_MONTH_GRID_STYLE } from '@/lib/schedule-year-strip'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type DeliverableLike = {
  id: string
  taskCode: string | null
  taskCodeDescription: string | null
  dueDate: string | null
  estimatedHours: number | null
  groupCode: string | null
}

const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000

const YEAR_GRID_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

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

function startOfLocalWeekSunday(d: Date) {
  const x = new Date(d)
  const day = x.getDay()
  x.setDate(x.getDate() - day)
  x.setHours(0, 0, 0, 0)
  return x
}

function addLocalMonths(d: Date, months: number) {
  const x = new Date(d)
  x.setMonth(x.getMonth() + months)
  return x
}

function endOfLocalDay(d: Date) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

function toDateInputValue(d: Date) {
  const x = new Date(d)
  const y = x.getFullYear()
  const m = String(x.getMonth() + 1).padStart(2, '0')
  const day = String(x.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDateInputLocal(isoDate: string, endOfDay: boolean) {
  const [y, mo, da] = isoDate.split('-').map(Number)
  if (!y || !mo || !da) return null
  return new Date(y, mo - 1, da, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0)
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
  const [rangePreset, setRangePreset] = useState<'week' | 'month' | 'quarter' | 'year' | 'custom'>('month')
  const today = useMemo(() => startOfLocalDay(new Date()), [])
  const [rangeStartInput, setRangeStartInput] = useState(() => toDateInputValue(addLocalDays(today, -16)))
  const [rangeEndInput, setRangeEndInput] = useState(() => toDateInputValue(addLocalDays(today, 16)))

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

    // Aggregate to high-level groups (prefer groupCode, otherwise first 2 letters of taskCode)
    for (const r of rows) {
      const g = (r.groupCode || r.code.slice(0, 2)).toUpperCase() || '??'
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

  const mid = useMemo(() => {
    if (rangePreset === 'year') return today
    if (points.min && points.max) return new Date((points.min.getTime() + points.max.getTime()) / 2)
    return points.min || points.max || today
  }, [points.min, points.max, rangePreset, today])

  const presetBounds = useMemo(() => {
    if (rangePreset === 'custom') return null
    if (rangePreset === 'year') {
      const y = mid.getFullYear()
      return { start: new Date(y, 0, 1, 0, 0, 0, 0), end: new Date(y, 11, 31, 23, 59, 59, 999) }
    }
    if (rangePreset === 'quarter') {
      const q = Math.floor(mid.getMonth() / 3)
      const start = new Date(mid.getFullYear(), q * 3, 1, 0, 0, 0, 0)
      const end = new Date(mid.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999)
      return { start, end }
    }
    if (rangePreset === 'month') {
      const start = startOfLocalWeekSunday(mid)
      const end = endOfLocalDay(addLocalDays(start, 27))
      return { start, end }
    }
    // week
    const start = startOfLocalWeekSunday(mid)
    const end = endOfLocalDay(addLocalDays(start, 6))
    return { start, end }
  }, [rangePreset, mid])

  const viewStart = useMemo(() => {
    if (rangePreset === 'custom') {
      const s = parseDateInputLocal(rangeStartInput, false)
      const e = parseDateInputLocal(rangeEndInput, true)
      if (!s || !e || e.getTime() <= s.getTime()) return startOfLocalDay(today)
      return startOfLocalDay(s)
    }
    return presetBounds?.start ?? startOfLocalDay(today)
  }, [rangePreset, rangeStartInput, rangeEndInput, presetBounds, today])

  const viewEnd = useMemo(() => {
    if (rangePreset === 'custom') {
      const s = parseDateInputLocal(rangeStartInput, false)
      const e = parseDateInputLocal(rangeEndInput, true)
      if (!s || !e || e.getTime() <= s.getTime()) return endOfLocalDay(addLocalDays(startOfLocalDay(today), 14))
      return e
    }
    return presetBounds?.end ?? endOfLocalDay(addLocalDays(startOfLocalDay(today), 14))
  }, [rangePreset, rangeStartInput, rangeEndInput, presetBounds, today])

  const applyPreset = (p: 'week' | 'month' | 'quarter' | 'year') => {
    setRangePreset(p)
    const b =
      p === 'custom'
        ? null
        : p === 'year'
          ? { start: new Date(mid.getFullYear(), 0, 1, 0, 0, 0, 0), end: new Date(mid.getFullYear(), 11, 31, 23, 59, 59, 999) }
          : p === 'quarter'
            ? (() => {
                const q = Math.floor(mid.getMonth() / 3)
                const start = new Date(mid.getFullYear(), q * 3, 1, 0, 0, 0, 0)
                const end = new Date(mid.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999)
                return { start, end }
              })()
            : p === 'month'
              ? (() => {
                  const start = startOfLocalWeekSunday(mid)
                  return { start, end: endOfLocalDay(addLocalDays(start, 27)) }
                })()
              : (() => {
                  const start = startOfLocalWeekSunday(mid)
                  return { start, end: endOfLocalDay(addLocalDays(start, 6)) }
                })()
    const start = b?.start ?? startOfLocalDay(today)
    const end = b?.end ?? endOfLocalDay(addLocalDays(startOfLocalDay(today), 14))
    setRangeStartInput(toDateInputValue(start))
    setRangeEndInput(toDateInputValue(end))
  }

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

  const YEAR_GRID_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

  const calendarLabels = useMemo(() => {
    if (rangePreset === 'custom') return null
    if (rangePreset === 'year') return [...YEAR_GRID_MONTHS]
    if (rangePreset === 'quarter') {
      const q = Math.floor(mid.getMonth() / 3)
      return YEAR_GRID_MONTHS.slice(q * 3, q * 3 + 3)
    }
    if (rangePreset === 'month') {
      const w0 = startOfLocalWeekSunday(viewStart)
      return Array.from({ length: 4 }, (_, i) => {
        const ws = addLocalDays(w0, i * 7)
        return ws.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      })
    }
    // week
    const d0 = startOfLocalDay(viewStart)
    return Array.from({ length: 7 }, (_, i) => {
      const d = addLocalDays(d0, i)
      return d.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' })
    })
  }, [rangePreset, mid, viewStart])

  const useCalendarGrid = !!calendarLabels

  const gridStyle = useMemo(() => {
    if (!calendarLabels) return undefined
    return {
      display: 'grid',
      gridTemplateColumns: `repeat(${calendarLabels.length}, minmax(0, 1fr))`,
      width: '100%',
      minWidth: 0,
    } as const
  }, [calendarLabels])

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
      const isMajor = d.getDay() === 1
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
    const minPx =
      rangePreset === 'week' ? 64 : rangePreset === 'month' ? 90 : rangePreset === 'custom' ? (rangeDays > 120 ? 120 : 90) : 120
    const kept: typeof majors = []
    let last = -Infinity
    for (const t of majors) {
      if (t.x - last >= minPx) {
        kept.push(t)
        last = t.x
      }
    }
    return kept
  }, [dayTicks, useCalendarGrid, rangePreset, rangeDays])

  const weekendBands = useMemo(() => {
    if (useCalendarGrid) return []
    if (rangePreset === 'quarter' || rangePreset === 'custom') return []
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
  }, [useCalendarGrid, rangePreset, viewStart, viewEnd, rangeDays, dateToX])

  const isEmpty = points.rows.length === 0

  return (
    <div className="w-full max-w-none rounded-lg border bg-card overflow-hidden">
      <div className="px-3 py-2 border-b bg-muted/20 text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-2 items-center">
        <div className="font-medium text-foreground">Deliverables timeline</div>
        <div>
          Range: {format(viewStart, 'MMM d, yyyy')} → {format(viewEnd, 'MMM d, yyyy')}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={cn('px-2 py-1 rounded border', rangePreset === 'week' ? 'bg-background text-foreground' : 'bg-transparent')}
            onClick={() => applyPreset('week')}
          >
            Week
          </button>
          <button
            type="button"
            className={cn('px-2 py-1 rounded border', rangePreset === 'month' ? 'bg-background text-foreground' : 'bg-transparent')}
            onClick={() => applyPreset('month')}
          >
            Month
          </button>
          <button
            type="button"
            className={cn('px-2 py-1 rounded border', rangePreset === 'quarter' ? 'bg-background text-foreground' : 'bg-transparent')}
            onClick={() => applyPreset('quarter')}
          >
            Quarter
          </button>
          <button
            type="button"
            className={cn('px-2 py-1 rounded border', rangePreset === 'year' ? 'bg-background text-foreground' : 'bg-transparent')}
            onClick={() => applyPreset('year')}
          >
            Year
          </button>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-[132px] space-y-1">
            <Label className="text-[10px] text-muted-foreground">From</Label>
            <Input
              type="date"
              className="h-8 text-[11px]"
              value={rangeStartInput}
              onChange={(e) => {
                const v = e.target.value
                setRangeStartInput(v)
                const s = parseDateInputLocal(v, false)
                const eEnd = parseDateInputLocal(rangeEndInput, true)
                const y = mid.getFullYear()
                const ys = new Date(y, 0, 1, 0, 0, 0, 0)
                const ye = new Date(y, 11, 31, 23, 59, 59, 999)
                setRangePreset(s && eEnd && sameLocalCalendarDay(s, ys) && sameLocalCalendarDay(eEnd, ye) ? 'year' : 'custom')
              }}
            />
          </div>
          <div className="w-[132px] space-y-1">
            <Label className="text-[10px] text-muted-foreground">To</Label>
            <Input
              type="date"
              className="h-8 text-[11px]"
              value={rangeEndInput}
              onChange={(e) => {
                const v = e.target.value
                setRangeEndInput(v)
                const s = parseDateInputLocal(rangeStartInput, false)
                const eEnd = parseDateInputLocal(v, true)
                const y = mid.getFullYear()
                const ys = new Date(y, 0, 1, 0, 0, 0, 0)
                const ye = new Date(y, 11, 31, 23, 59, 59, 999)
                setRangePreset(s && eEnd && sameLocalCalendarDay(s, ys) && sameLocalCalendarDay(eEnd, ye) ? 'year' : 'custom')
              }}
            />
          </div>
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
        {isEmpty ? (
          <div className="rounded-lg border bg-muted/10 p-3 text-sm text-muted-foreground">No deliverables selected yet.</div>
        ) : (
          <>
            <div ref={timelineRef} className="relative w-full min-w-0 rounded-md border overflow-hidden bg-muted/10">
              <div
                className={
                  useCalendarGrid ? 'h-8 border-b bg-muted/20 [&>*]:min-w-0' : 'h-8 border-b bg-muted/20 relative'
                }
                style={useCalendarGrid ? gridStyle : undefined}
              >
                {useCalendarGrid && calendarLabels ? (
                  calendarLabels.map((label, i) => (
                    <div
                      key={label}
                      className={cn(
                        'flex items-center justify-center border-r border-border/80 text-[11px] text-muted-foreground',
                        i % 2 === 1 ? 'bg-muted/10' : ''
                      )}
                    >
                      {label}
                    </div>
                  ))
                ) : null}
                {!useCalendarGrid ? (
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
                ) : null}
              </div>

              <div className="relative">
                <div className="absolute left-0 right-0 top-0 bottom-0 pointer-events-none">
                  {/* grid overlay - already drawn in header; keep row separators */}
                </div>
                {points.rows.map((t) => {
                  const isSelected = !!selectedTaskId && t.id === selectedTaskId
                  const markerLeft: number | string = (() => {
                    if (useCalendarGrid) {
                      if (!t.due) return '98%'
                      const frac = (t.due.getTime() - viewStart.getTime()) / totalMs
                      const clamped = Math.max(0.03, Math.min(0.97, frac))
                      return `${clamped * 100}%`
                    }
                    const x = t.due ? dateToX(t.due) : timelineWidth - 8
                    return Math.max(14, Math.min(timelineWidth - 14, x))
                  })()
                  return (
                    <div key={t.id} className="relative border-t" style={{ height: 44 }}>
                      {useCalendarGrid && calendarLabels && gridStyle ? (
                        <div className="absolute inset-0 z-0 pointer-events-none [&>*]:min-w-0" style={gridStyle}>
                          {calendarLabels.map((label, i) => (
                            <div key={`${t.id}-cg-${label}`} className={cn('border-r border-border/40', i % 2 === 1 ? 'bg-muted/10' : '')} />
                          ))}
                        </div>
                      ) : null}
                      <div className="absolute left-2 top-1/2 z-[1] -translate-y-1/2 text-xs font-mono text-muted-foreground">
                        {t.taskCode}
                      </div>
                      <button
                        type="button"
                        className={cn(
                          'absolute top-1/2 z-[1] -translate-y-1/2 -translate-x-1/2 h-7 px-2 rounded-md text-[11px] border shadow-sm flex items-center gap-2',
                          isSelected
                            ? 'bg-purple-700 border-purple-900 text-white'
                            : 'bg-purple-600/90 border-purple-900/80 text-white hover:bg-purple-600'
                        )}
                        style={{ left: markerLeft }}
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
          </>
        )}
      </div>
    </div>
  )
}

