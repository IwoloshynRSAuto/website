/**
 * Round time to the nearest 15 minutes
 * Examples: 8:05 → 8:00, 8:23 → 8:30, 8:38 → 8:30, 8:46 → 8:45
 */
export function roundToNearest15Minutes(dateTime: Date): Date {
  const rounded = new Date(dateTime)
  const minutes = rounded.getMinutes()
  
  // Round to nearest 15 minutes
  const roundedMinutes = Math.round(minutes / 15) * 15
  
  rounded.setMinutes(roundedMinutes)
  rounded.setSeconds(0)
  rounded.setMilliseconds(0)
  
  return rounded
}

/**
 * Round a time string (HH:MM) to the nearest 15 minutes
 * @param timeString - Time in format "HH:MM" (24-hour)
 * @returns Rounded time string in format "HH:MM"
 */
export function roundTimeString(timeString: string): string {
  const [hours, minutes] = timeString.split(':').map(Number)
  
  const roundedMinutes = Math.round(minutes / 15) * 15
  const finalMinutes = roundedMinutes === 60 ? 0 : roundedMinutes
  const finalHours = roundedMinutes === 60 ? hours + 1 : hours
  
  return `${finalHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`
}

/**
 * Calculate hours between two Date objects (rounded to nearest 15 minutes)
 */
export function calculateHoursBetween(start: Date, end: Date): number {
  const diffMs = end.getTime() - start.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  return Math.round(diffHours * 4) / 4 // Round to nearest 0.25 (15 minutes)
}

/**
 * Get date-only string (YYYY-MM-DD) from Date
 */
export function getDateOnly(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Format time for display (HH:MM AM/PM)
 */
export function formatTime12Hour(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

/**
 * Format time for display (HH:MM 24-hour)
 */
export function formatTime24Hour(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

/**
 * Convert 12-hour time string (HH:MM AM/PM) to 24-hour format (HH:MM)
 */
export function convert12To24Hour(time12: string): string {
  const [time, periodRaw] = time12.trim().split(/\s+/)
  const [hours, minutes] = time.split(':').map(Number)
  const period = periodRaw?.toUpperCase()
  
  let hour24 = hours
  if (period === 'PM' && hours !== 12) {
    hour24 = hours + 12
  } else if (period === 'AM' && hours === 12) {
    hour24 = 0
  } else if (!period) {
    // Heuristic for bare times like "4:00": default common afternoon entries to PM.
    // Keeps typical morning values (7-11) as AM.
    if (hours >= 1 && hours <= 6) {
      hour24 = hours + 12
    } else if (hours === 12) {
      hour24 = 12
    }
  }
  
  return `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

/**
 * Convert 24-hour time string (HH:MM) to 12-hour format (HH:MM AM/PM)
 */
export function convert24To12Hour(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`
}

/**
 * Clock-in instants used for "job-only" / container timesheets (see POST /api/timesheets).
 * Local midnight can be stored as early-morning UTC; match that so overlap checks skip these rows.
 */
export function isJobOnlyClockInInstant(clockInTime: Date): boolean {
  const utcHours = clockInTime.getUTCHours()
  const utcMinutes = clockInTime.getUTCMinutes()
  const isMidnightUtc =
    (utcHours === 0 && utcMinutes === 0) || (utcHours >= 0 && utcHours <= 6 && utcMinutes === 0)
  const isMidnightLocal = clockInTime.getHours() === 0 && clockInTime.getMinutes() === 0
  return isMidnightUtc || isMidnightLocal
}

/**
 * Rows to ignore when testing attendance overlap: open job containers (has job entries, no clock-out)
 * or midnight placeholder job-only sheets. Closed rows always participate.
 */
export function isOverlapExcludedTimesheet(entry: {
  clockInTime: Date
  clockOutTime: Date | null
  jobEntries?: { length: number } | null
}): boolean {
  if (entry.clockOutTime) return false
  const jobCount = entry.jobEntries?.length ?? 0
  if (jobCount > 0) return true
  return isJobOnlyClockInInstant(new Date(entry.clockInTime))
}

