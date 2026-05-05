'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

const DAY_MS = 86_400_000
const WEEK_MS = 7 * DAY_MS
const HOUR_MS = 3_600_000
const SNAP_15M_MS = 15 * 60 * 1000

type SnapMode = '15m' | 'day' | 'week'

function startOfLocalDayMs(ms: number) {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function startOfLocalWeekSundayMs(ms: number) {
  const d = new Date(ms)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function snapModeForRangeDays(rangeDays: number): SnapMode {
  if (rangeDays >= 14) return 'week'
  if (rangeDays >= 2) return 'day'
  return '15m'
}

function snapMsToMode(ms: number, mode: SnapMode) {
  if (mode === 'week') return startOfLocalWeekSundayMs(ms)
  if (mode === 'day') return startOfLocalDayMs(ms)
  return Math.round(ms / SNAP_15M_MS) * SNAP_15M_MS
}

function minSegmentMs(mode: SnapMode) {
  if (mode === 'week') return WEEK_MS
  if (mode === 'day') return DAY_MS
  return SNAP_15M_MS
}

function rubberWeekRangeMs(aMs: number, bMs: number, rangeStart: Date, rangeEnd: Date) {
  const lo = Math.min(aMs, bMs)
  const hi = Math.max(aMs, bMs)
  const weekStartLo = startOfLocalWeekSundayMs(lo)
  const weekEndHi = startOfLocalWeekSundayMs(hi) + WEEK_MS - 1
  const start = Math.max(weekStartLo, rangeStart.getTime())
  const end = Math.min(Math.max(weekEndHi, start + WEEK_MS - 1), rangeEnd.getTime())
  return { start, end }
}

export type TimelineRow = { id: string; label: string }

export type TimelineBlock = {
  id: string
  rowId: string
  start: Date
  end: Date
  label: string
  subtitle?: string
  variant?: 'default' | 'danger' | 'success'
}

type DragCreateState = { rowId: string; x0: number; x1: number }

type DragMoveState = {
  blockId: string
  rowId: string
  originStart: number
  originEnd: number
  anchorX: number
  pointerX: number
}

type DragResizeState = {
  blockId: string
  rowId: string
  edge: 'start' | 'end'
  originStart: number
  originEnd: number
  anchorX: number
  pointerX: number
}

type SchedulingTimelineProps = {
  rows: TimelineRow[]
  blocks: TimelineBlock[]
  rangeStart: Date
  rangeEnd: Date
  /** Horizontal density; wider = more pixels per hour */
  pixelsPerHour?: number
  rowHeight?: number
  onBlockMove?: (blockId: string, start: Date, end: Date) => void
  /** Fires after user finishes a drag-selection on empty grid space */
  onRangeCreate?: (rowId: string, start: Date, end: Date) => void
  emptyHint?: string
  className?: string
  /** Day bands + midnight grid (classic Gantt read-friendly timeline) */
  ganttStyle?: boolean
  /** Left column title (default "Resource") */
  resourceLabel?: string
}

export function SchedulingTimeline({
  rows,
  blocks,
  rangeStart,
  rangeEnd,
  pixelsPerHour = 52,
  rowHeight = 44,
  onBlockMove,
  onRangeCreate,
  emptyHint = 'Drag across a row to block out time, then choose what it is.',
  className,
  ganttStyle = false,
  resourceLabel = 'Resource',
}: SchedulingTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const laneRef = useRef<HTMLDivElement>(null)

  const totalMs = Math.max(rangeEnd.getTime() - rangeStart.getTime(), 60_000)
  const rangeDays = totalMs / DAY_MS
  const snapMode = snapModeForRangeDays(rangeDays)
  const minSegMs = minSegmentMs(snapMode)

  /** Big-picture: cap width for multi-week views so the chart fits on screen (time is compressed). */
  const hourSpacedWidth = (totalMs / HOUR_MS) * pixelsPerHour
  const maxTimelineW = rangeDays >= 14 ? 1760 : rangeDays >= 3 ? 2200 : 28_000
  const minTimelineW = Math.max(800, Math.ceil(rangeDays) * (rangeDays >= 14 ? 5 : 10))
  const timelineWidth = Math.min(Math.max(hourSpacedWidth, minTimelineW), maxTimelineW)

  const xToDateRaw = useCallback(
    (x: number) => {
      const frac = Math.max(0, Math.min(1, x / timelineWidth))
      return new Date(rangeStart.getTime() + frac * totalMs)
    },
    [rangeStart, timelineWidth, totalMs]
  )

  const xToDate = useCallback(
    (x: number) => {
      const frac = Math.max(0, Math.min(1, x / timelineWidth))
      const raw = rangeStart.getTime() + frac * totalMs
      return new Date(snapMsToMode(raw, snapMode))
    },
    [rangeStart, timelineWidth, totalMs, snapMode]
  )

  const dateToX = useCallback(
    (d: Date) => {
      const frac = (d.getTime() - rangeStart.getTime()) / totalMs
      return frac * timelineWidth
    },
    [rangeStart, totalMs, timelineWidth]
  )

  const headerHeightPx = 52
  const chartBodyHeight = rows.length * rowHeight

  const ganttLayers = useMemo(() => {
    if (!ganttStyle) return { dayBands: [] as { left: number; width: number; alt: boolean }[], midnightLines: [] as { left: number }[] }
    const dayBands: { left: number; width: number; alt: boolean }[] = []
    const midnightLines: { left: number }[] = []

    if (rangeDays >= 14) {
      let t = startOfLocalWeekSundayMs(rangeStart.getTime())
      let i = 0
      while (t < rangeEnd.getTime()) {
        const wkEnd = Math.min(t + WEEK_MS - 1, rangeEnd.getTime())
        const segA = Math.max(t, rangeStart.getTime())
        const segB = Math.min(wkEnd, rangeEnd.getTime())
        if (segB > segA) {
          const left = dateToX(new Date(segA))
          const right = dateToX(new Date(segB))
          dayBands.push({ left, width: Math.max(right - left, 1), alt: i % 2 === 1 })
        }
        midnightLines.push({ left: dateToX(new Date(t)) })
        t += WEEK_MS
        i++
      }
      return { dayBands, midnightLines }
    }

    const cursor = new Date(rangeStart)
    cursor.setHours(0, 0, 0, 0)
    let i = 0
    while (cursor.getTime() < rangeEnd.getTime()) {
      const dayStart = new Date(cursor)
      const dayEnd = new Date(cursor)
      dayEnd.setHours(23, 59, 59, 999)
      const segA = Math.max(dayStart.getTime(), rangeStart.getTime())
      const segB = Math.min(dayEnd.getTime(), rangeEnd.getTime())
      if (segB > segA) {
        const left = dateToX(new Date(segA))
        const right = dateToX(new Date(segB))
        dayBands.push({ left, width: Math.max(right - left, 1), alt: i % 2 === 1 })
      }
      midnightLines.push({ left: dateToX(new Date(dayStart)) })
      cursor.setDate(cursor.getDate() + 1)
      i++
    }
    return { dayBands, midnightLines }
  }, [ganttStyle, rangeStart, rangeEnd, dateToX, rangeDays])

  const [rubber, setRubber] = useState<DragCreateState | null>(null)
  const [moveDrag, setMoveDrag] = useState<DragMoveState | null>(null)
  const [resizeDrag, setResizeDrag] = useState<DragResizeState | null>(null)

  const tickMarks = useMemo(() => {
    const marks: { x: number; label: string; major: boolean }[] = []
    const MIN_LABEL_PX = 72

    /** Never use hour-scale ticks when the range is multi-day (keeps Gantt readable). */
    const candidateSteps =
      rangeDays >= 14
        ? [DAY_MS, 2 * DAY_MS, WEEK_MS, 2 * WEEK_MS, 14 * DAY_MS, 30 * DAY_MS, 90 * DAY_MS]
        : rangeDays >= 7
          ? [DAY_MS, 2 * DAY_MS, 3 * DAY_MS, WEEK_MS, 2 * WEEK_MS, 14 * DAY_MS]
          : rangeDays >= 2
            ? [DAY_MS, 2 * DAY_MS, 3 * DAY_MS, 4 * DAY_MS, WEEK_MS, 2 * WEEK_MS]
            : [HOUR_MS, 2 * HOUR_MS, 3 * HOUR_MS, 6 * HOUR_MS, 12 * HOUR_MS, DAY_MS, 2 * DAY_MS, WEEK_MS]

    const minStepForRange = rangeDays >= 2 ? DAY_MS : HOUR_MS

    let step: number | null = null
    for (const s of candidateSteps) {
      if (s > totalMs * 0.95) continue
      const px = (s / totalMs) * timelineWidth
      if (px >= MIN_LABEL_PX) {
        step = s
        break
      }
    }
    if (step == null) {
      const usable = candidateSteps.filter((s) => s <= totalMs * 0.95)
      step = usable.length > 0 ? usable[usable.length - 1]! : minStepForRange
    }
    if ((step / totalMs) * timelineWidth < MIN_LABEL_PX) {
      const target = Math.min(14, Math.max(4, Math.floor(timelineWidth / MIN_LABEL_PX)))
      step = Math.max(minStepForRange, totalMs / target)
    }

    const pxPerTick = (step / totalMs) * timelineWidth
    const compactDayLabels = pxPerTick < 100

    let t: number
    if (step >= 6 * DAY_MS) {
      t = startOfLocalWeekSundayMs(rangeStart.getTime())
      while (t < rangeStart.getTime()) t += step
    } else {
      t = Math.ceil(rangeStart.getTime() / step) * step
    }
    const endT = rangeEnd.getTime()
    while (t <= endT) {
      const x = dateToX(new Date(t))
      const d = new Date(t)
      const label =
        step >= 7 * DAY_MS
          ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })
          : step >= DAY_MS
            ? compactDayLabels
              ? d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })
              : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
            : d.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })
      marks.push({ x, label, major: step >= DAY_MS })
      t += step
    }

    const MIN_X_GAP = 76
    const thinned: typeof marks = []
    for (const m of marks) {
      const prev = thinned[thinned.length - 1]
      if (!prev || m.x - prev.x >= MIN_X_GAP) {
        thinned.push(m)
      }
    }
    return thinned
  }, [rangeStart, rangeEnd, totalMs, timelineWidth, dateToX, rangeDays])

  useEffect(() => {
    const onWinMouseMove = (e: MouseEvent) => {
      if (!laneRef.current) return
      const rect = laneRef.current.getBoundingClientRect()
      const scrollLeft = scrollRef.current?.scrollLeft ?? 0
      const x = e.clientX - rect.left + scrollLeft

      if (rubber) {
        setRubber((r) => (r ? { ...r, x1: x } : null))
      }
      if (moveDrag) {
        setMoveDrag((m) => (m ? { ...m, pointerX: x } : null))
      }
      if (resizeDrag) {
        setResizeDrag((r) => (r ? { ...r, pointerX: x } : null))
      }
    }

    const onWinMouseUp = () => {
      if (rubber && onRangeCreate) {
        const left = Math.min(rubber.x0, rubber.x1)
        const right = Math.max(rubber.x0, rubber.x1)
        const minPx = 6
        if (right - left >= minPx) {
          const rawS = xToDateRaw(left).getTime()
          const rawE = xToDateRaw(right).getTime()
          if (snapMode === 'week') {
            const { start, end } = rubberWeekRangeMs(rawS, rawE, rangeStart, rangeEnd)
            onRangeCreate(rubber.rowId, new Date(start), new Date(end))
          } else if (snapMode === 'day') {
            const lo = Math.min(rawS, rawE)
            const hi = Math.max(rawS, rawE)
            let s = Math.max(startOfLocalDayMs(lo), rangeStart.getTime())
            let en = Math.min(startOfLocalDayMs(hi) + DAY_MS - 1, rangeEnd.getTime())
            if (en <= s) en = Math.min(s + DAY_MS - 1, rangeEnd.getTime())
            onRangeCreate(rubber.rowId, new Date(s), new Date(en))
          } else {
            let s = snapMsToMode(Math.min(rawS, rawE), '15m')
            let en = snapMsToMode(Math.max(rawS, rawE), '15m')
            if (en <= s) en = s + SNAP_15M_MS
            onRangeCreate(rubber.rowId, new Date(s), new Date(en))
          }
        }
      }
      setRubber(null)

      if (moveDrag && onBlockMove) {
        const dxPx = moveDrag.pointerX - moveDrag.anchorX
        const dxMs = (dxPx / timelineWidth) * totalMs
        const dur = moveDrag.originEnd - moveDrag.originStart
        const targetStart = moveDrag.originStart + dxMs
        let ns: number
        if (snapMode === 'week') {
          ns = startOfLocalWeekSundayMs(targetStart)
        } else if (snapMode === 'day') {
          ns = startOfLocalDayMs(targetStart)
        } else {
          ns = snapMsToMode(targetStart, '15m')
        }
        let ne = ns + dur
        const minT = rangeStart.getTime()
        const maxT = rangeEnd.getTime()
        if (ns < minT) {
          const shift = minT - ns
          ns += shift
          ne += shift
        }
        if (ne > maxT) {
          const shift = ne - maxT
          ns -= shift
          ne -= shift
        }
        onBlockMove(moveDrag.blockId, new Date(ns), new Date(ne))
      }
      setMoveDrag(null)

      if (resizeDrag && onBlockMove) {
        const dxPx = resizeDrag.pointerX - resizeDrag.anchorX
        const dxMs = (dxPx / timelineWidth) * totalMs
        let ns = resizeDrag.originStart
        let ne = resizeDrag.originEnd
        if (resizeDrag.edge === 'start') {
          ns = snapMsToMode(resizeDrag.originStart + dxMs, snapMode)
          if (ns >= ne - minSegMs) ns = ne - minSegMs
        } else {
          ne = snapMsToMode(resizeDrag.originEnd + dxMs, snapMode)
          if (ne <= ns + minSegMs) ne = ns + minSegMs
        }
        ns = Math.max(ns, rangeStart.getTime())
        ne = Math.min(ne, rangeEnd.getTime())
        if (ne > ns) onBlockMove(resizeDrag.blockId, new Date(ns), new Date(ne))
      }
      setResizeDrag(null)
    }

    window.addEventListener('mousemove', onWinMouseMove)
    window.addEventListener('mouseup', onWinMouseUp)
    return () => {
      window.removeEventListener('mousemove', onWinMouseMove)
      window.removeEventListener('mouseup', onWinMouseUp)
    }
  }, [
    rubber,
    moveDrag,
    resizeDrag,
    onRangeCreate,
    onBlockMove,
    xToDateRaw,
    timelineWidth,
    totalMs,
    rangeStart,
    rangeEnd,
    snapMode,
    minSegMs,
  ])

  const startRubber = (rowId: string, clientX: number) => {
    if (!laneRef.current || !scrollRef.current) return
    const rect = laneRef.current.getBoundingClientRect()
    const scrollLeft = scrollRef.current.scrollLeft
    const x = clientX - rect.left + scrollLeft
    setRubber({ rowId, x0: x, x1: x })
  }

  const startMove = (e: React.MouseEvent, b: TimelineBlock) => {
    e.stopPropagation()
    if (!laneRef.current || !scrollRef.current || !onBlockMove) return
    const rect = laneRef.current.getBoundingClientRect()
    const scrollLeft = scrollRef.current.scrollLeft
    const x = e.clientX - rect.left + scrollLeft
    setMoveDrag({
      blockId: b.id,
      rowId: b.rowId,
      originStart: b.start.getTime(),
      originEnd: b.end.getTime(),
      anchorX: x,
      pointerX: x,
    })
  }

  const startResize = (e: React.MouseEvent, b: TimelineBlock, edge: 'start' | 'end') => {
    e.stopPropagation()
    if (!laneRef.current || !scrollRef.current || !onBlockMove) return
    const rect = laneRef.current.getBoundingClientRect()
    const scrollLeft = scrollRef.current.scrollLeft
    const x = e.clientX - rect.left + scrollLeft
    setResizeDrag({
      blockId: b.id,
      rowId: b.rowId,
      edge,
      originStart: b.start.getTime(),
      originEnd: b.end.getTime(),
      anchorX: x,
      pointerX: x,
    })
  }

  const displayBlock = (b: TimelineBlock) => {
    if (moveDrag && moveDrag.blockId === b.id) {
      const dxPx = moveDrag.pointerX - moveDrag.anchorX
      const dxMs = (dxPx / timelineWidth) * totalMs
      const ns = moveDrag.originStart + dxMs
      const ne = moveDrag.originEnd + dxMs
      return { ...b, start: new Date(ns), end: new Date(ne) }
    }
    if (resizeDrag && resizeDrag.blockId === b.id) {
      const dxPx = resizeDrag.pointerX - resizeDrag.anchorX
      const dxMs = (dxPx / timelineWidth) * totalMs
      let ns = resizeDrag.originStart
      let ne = resizeDrag.originEnd
      if (resizeDrag.edge === 'start') ns = resizeDrag.originStart + dxMs
      else ne = resizeDrag.originEnd + dxMs
      return { ...b, start: new Date(ns), end: new Date(ne) }
    }
    return b
  }

  if (rows.length === 0) {
    return (
      <div className={cn('rounded-lg border border-dashed bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground', className)}>
        {emptyHint}
      </div>
    )
  }

  return (
    <div className={cn('flex rounded-lg border bg-card overflow-hidden shadow-sm', className)}>
      <div className={cn('shrink-0 border-r bg-muted/40', ganttStyle ? 'w-56 min-w-[14rem]' : 'w-44')}>
        <div className="h-[52px] min-h-[52px] border-b flex items-center px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {resourceLabel}
        </div>
        {rows.map((r) => (
          <div
            key={r.id}
            className="border-b flex items-center px-3 text-sm font-medium truncate"
            style={{ height: rowHeight }}
            title={r.label}
          >
            {r.label}
          </div>
        ))}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-hidden">
        <div style={{ width: timelineWidth }} className="relative">
          {ganttStyle ? (
            <>
              {ganttLayers.dayBands.map((b, idx) => (
                <div
                  key={`gantt-band-${idx}`}
                  className={cn('pointer-events-none absolute z-0', b.alt ? 'bg-muted/35' : 'bg-muted/[0.12]')}
                  style={{
                    left: b.left,
                    width: b.width,
                    top: headerHeightPx,
                    height: chartBodyHeight,
                  }}
                />
              ))}
              {ganttLayers.midnightLines.map((ln, idx) => (
                <div
                  key={`gantt-mid-${idx}`}
                  className="pointer-events-none absolute z-0 border-l border-border/55"
                  style={{ left: ln.left, top: 0, height: headerHeightPx + chartBodyHeight }}
                />
              ))}
            </>
          ) : null}
          <div
            ref={laneRef}
            className="relative z-[1] h-[52px] min-h-[52px] border-b bg-muted/20 overflow-hidden"
          >
            {tickMarks.map((m, i) => (
              <div
                key={i}
                className={cn(
                  'absolute top-0 bottom-0 border-l pointer-events-none',
                  m.major ? 'border-border/80' : 'border-border/40'
                )}
                style={{ left: m.x }}
              >
                <span
                  className={cn(
                    'absolute left-0.5 top-1.5 max-w-[7rem] truncate text-[10px] leading-tight text-muted-foreground font-medium',
                    m.major && 'font-semibold text-foreground/80'
                  )}
                  title={m.label}
                >
                  {m.label}
                </span>
              </div>
            ))}
          </div>

          {rows.map((row) => (
            <div
              key={row.id}
              className={cn(
                'relative z-[1] border-b',
                ganttStyle
                  ? 'bg-transparent'
                  : 'bg-[length:24px_100%] bg-[linear-gradient(90deg,transparent_23px,hsl(var(--border)/0.35)_24px)]'
              )}
              style={{ height: rowHeight }}
              onMouseDown={(e) => {
                if (!onRangeCreate) return
                if (e.button !== 0) return
                const t = e.target as HTMLElement
                if (t.closest('[data-timeline-block]')) return
                startRubber(row.id, e.clientX)
              }}
            >
              {blocks
                .filter((b) => b.rowId === row.id)
                .map((b) => {
                  const d = displayBlock(b)
                  const left = dateToX(d.start)
                  const w = Math.max(dateToX(d.end) - left, 6)
                  const bg =
                    d.variant === 'danger'
                      ? 'bg-rose-500/90 border-rose-700'
                      : d.variant === 'success'
                        ? 'bg-emerald-500/90 border-emerald-700'
                        : 'bg-sky-600/90 border-sky-800'
                  return (
                    <div
                      key={b.id}
                      data-timeline-block
                      className={cn(
                        'absolute top-1 rounded border shadow-sm text-white cursor-grab active:cursor-grabbing select-none overflow-hidden',
                        bg
                      )}
                      style={{ left, width: w, height: rowHeight - 8 }}
                      title={`${d.label}${d.subtitle ? `\n${d.subtitle}` : ''}`}
                      onMouseDown={(e) => startMove(e, b)}
                    >
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/30 z-10"
                        onMouseDown={(e) => startResize(e, b, 'start')}
                      />
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/30 z-10"
                        onMouseDown={(e) => startResize(e, b, 'end')}
                      />
                      <div className="px-2 py-0.5 text-[11px] leading-tight font-semibold truncate pointer-events-none">
                        {d.label}
                      </div>
                      {d.subtitle ? (
                        <div className="px-2 text-[10px] opacity-90 truncate pointer-events-none">{d.subtitle}</div>
                      ) : null}
                    </div>
                  )
                })}

              {rubber && rubber.rowId === row.id ? (
                <div
                  className="absolute top-1 bottom-1 rounded bg-primary/25 border border-primary pointer-events-none z-20"
                  style={{
                    left: Math.min(rubber.x0, rubber.x1),
                    width: Math.abs(rubber.x1 - rubber.x0),
                  }}
                />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
