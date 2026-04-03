import { DateTime } from 'luxon'

/**
 * Convert local wall-clock components to a UTC instant.
 * Uses IANA zone when valid so DST is correct per calendar date; otherwise
 * falls back to the legacy `Date.UTC(...) + offsetMinutes` formula.
 */
export function wallClockToUtcDate(
  year: number,
  monthIndex: number,
  day: number,
  hour: number,
  minute: number,
  ianaTimeZone: string | null | undefined,
  fallbackOffsetMinutes: number
): Date {
  const raw = typeof ianaTimeZone === 'string' ? ianaTimeZone.trim() : ''
  if (raw.length > 0) {
    const probe = DateTime.fromObject({ year: 2000, month: 1, day: 1 }, { zone: raw })
    if (probe.isValid) {
      const dt = DateTime.fromObject(
        {
          year,
          month: monthIndex + 1,
          day,
          hour,
          minute,
          second: 0,
          millisecond: 0,
        },
        { zone: raw }
      )
      if (dt.isValid) {
        return dt.toJSDate()
      }
    }
  }
  const utcMs =
    Date.UTC(year, monthIndex, day, hour, minute, 0, 0) + fallbackOffsetMinutes * 60 * 1000
  return new Date(utcMs)
}
