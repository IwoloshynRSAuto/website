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
  const [time, period] = time12.split(' ')
  const [hours, minutes] = time.split(':').map(Number)
  
  let hour24 = hours
  if (period === 'PM' && hours !== 12) {
    hour24 = hours + 12
  } else if (period === 'AM' && hours === 12) {
    hour24 = 0
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

