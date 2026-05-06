/** Schedule "Year" preset uses exact calendar-year bounds (no padding). */
export const SCHEDULE_YEAR_PAD_DAYS = 0

export function sameLocalCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** Visible dates for calendar year of `reference`. */
export function paddedVisibleYearBounds(reference: Date): { start: Date; end: Date } {
  const y = reference.getFullYear()
  const start = new Date(y, 0, 1, 0, 0, 0, 0)
  const end = new Date(y, 11, 31, 23, 59, 59, 999)
  return { start, end }
}

/** True when From/To match the Schedule “Year” preset bounds for the year implied by their midpoint. */
export function matchesScheduleYearVisibleRange(start: Date, end: Date): boolean {
  const mid = new Date((start.getTime() + end.getTime()) / 2)
  const b = paddedVisibleYearBounds(mid)
  return sameLocalCalendarDay(start, b.start) && sameLocalCalendarDay(end, b.end)
}

/** Inline styles so the Jan–Dec strip always fills width (avoids Tailwind / containing-block surprises). */
export const TWELVE_MONTH_GRID_STYLE = {
  display: 'grid',
  gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
  width: '100%',
  minWidth: 0,
} as const
