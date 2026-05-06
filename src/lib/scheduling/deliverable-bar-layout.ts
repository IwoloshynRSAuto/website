/** Work-calendar helpers for schedule bars (8h/day, skip weekends) — aligned with DeliverablesTimeline. */

const HOURS_PER_WORKDAY = 8

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

function isWeekend(d: Date) {
  const dow = d.getDay()
  return dow === 0 || dow === 6
}

function subtractBusinessDays(end: Date, businessDays: number) {
  let cur = startOfLocalDay(end)
  let remaining = businessDays
  while (remaining > 0) {
    cur = addLocalDays(cur, -1)
    if (!isWeekend(cur)) remaining -= 1
  }
  return cur
}

export function barStartFromDueAndHours(due: Date, hours: number) {
  const h = Number(hours || 0)
  const days = Math.max(1, Math.ceil(h / HOURS_PER_WORKDAY))
  const businessDaysBeforeDue = Math.max(0, days - 1)
  const start = businessDaysBeforeDue ? subtractBusinessDays(due, businessDaysBeforeDue) : startOfLocalDay(due)
  return { start, days }
}

/** Use catalog hours when set; otherwise assume one workday so unknown items still show a thin bar. */
export function effectiveDeliverableHours(estimatedHours?: number | null): number {
  const n = Number(estimatedHours ?? 0)
  return n > 0 ? n : HOURS_PER_WORKDAY
}

/** When hours aren’t stored per deliverable, spread effort across items using quoted labor + stable jitter so bars differ in length. */
export function inferDeliverableEffortHours(args: {
  quotedHours: number
  deliverableCount: number
  deliverableId: string
}): number {
  const n = Math.max(args.deliverableCount, 1)
  const share = args.quotedHours > 0 ? args.quotedHours / n : HOURS_PER_WORKDAY
  let h = 2166136261
  const id = args.deliverableId
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const jitter = 0.7 + ((h >>> 0) % 61) / 100
  return Math.min(160, Math.max(4, share * jitter))
}

export function deliverableWorkSpan(due: Date, estimatedHours?: number | null) {
  const hoursUsed = effectiveDeliverableHours(estimatedHours)
  const { start, days } = barStartFromDueAndHours(due, hoursUsed)
  return { start, due, businessDays: days, hoursUsed }
}

/** Use when hours were resolved externally (e.g. inferred from quoted labor). */
export function deliverableWorkSpanWithHours(due: Date, hoursUsed: number) {
  const { start, days } = barStartFromDueAndHours(due, hoursUsed)
  return { start, due, businessDays: days, hoursUsed }
}

export type TimelineBarLayout =
  | { mode: 'px'; left: number; width: number }
  | { mode: 'pct'; left: string; width: string }

export function layoutSpanOnTimeline(
  spanStart: Date,
  spanEnd: Date,
  opts: {
    rangeStart: Date
    rangeEnd: Date
    viewStart: Date
    totalMs: number
    useCalendarGrid: boolean
    dateToX: (d: Date) => number
    minWidthPx: number
    minWidthFrac: number
  }
): TimelineBarLayout | null {
  const rs = opts.rangeStart.getTime()
  const re = opts.rangeEnd.getTime()
  const lo = Math.max(spanStart.getTime(), rs)
  const hi = Math.min(spanEnd.getTime(), re)
  if (hi <= lo) return null

  const vs = opts.viewStart.getTime()
  if (opts.useCalendarGrid) {
    const lf = Math.max(0, Math.min(1, (lo - vs) / opts.totalMs))
    const rf = Math.max(0, Math.min(1, (hi - vs) / opts.totalMs))
    const widthFrac = Math.max(opts.minWidthFrac, rf - lf)
    return { mode: 'pct', left: `${lf * 100}%`, width: `${widthFrac * 100}%` }
  }

  const left = opts.dateToX(new Date(lo))
  const right = opts.dateToX(new Date(hi))
  const width = Math.max(right - left, opts.minWidthPx)
  return { mode: 'px', left, width }
}
