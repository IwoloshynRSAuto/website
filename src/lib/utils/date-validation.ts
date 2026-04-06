/**
 * Date validation utilities for API endpoints
 * Ensures consistent date parsing and validation across all timekeeping APIs
 */

import { z } from 'zod'
import { getWeekStart, getWeekEnd, normalizeWeekStartToUTC, normalizeWeekEndToUTC } from './date-utils'

/**
 * Validates that a date string can be parsed correctly
 * Handles both ISO strings and YYYY-MM-DD format
 */
export function parseDateString(dateString: string): Date {
  // Handle YYYY-MM-DD format (date-only, no time)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number)
    // Use noon to avoid timezone issues when converting to UTC
    return new Date(year, month - 1, day, 12, 0, 0, 0)
  }
  
  // Handle ISO string format
  const parsed = new Date(dateString)
  if (isNaN(parsed.getTime())) {
    throw new Error(`Invalid date string: ${dateString}`)
  }
  return parsed
}

/**
 * Validates that a date is within a valid range (not too far in past/future)
 */
export function validateDateRange(date: Date, maxPastDays: number = 365, maxFutureDays: number = 30): void {
  const now = new Date()
  const pastLimit = new Date(now.getTime() - maxPastDays * 24 * 60 * 60 * 1000)
  const futureLimit = new Date(now.getTime() + maxFutureDays * 24 * 60 * 60 * 1000)
  
  if (date < pastLimit) {
    throw new Error(`Date is too far in the past: ${date.toISOString()}`)
  }
  if (date > futureLimit) {
    throw new Error(`Date is too far in the future: ${date.toISOString()}`)
  }
}

/**
 * Validates that weekStart and weekEnd form a valid Sunday-Saturday week
 */
export function validateWeekBoundaries(weekStart: Date, weekEnd: Date): { weekStart: Date; weekEnd: Date } {
  // Check if the dates are already valid week boundaries (within 7 days)
  const weekStartTime = weekStart.getTime()
  const weekEndTime = weekEnd.getTime()
  const weekDuration = 7 * 24 * 60 * 60 * 1000 - 1 // 7 days minus 1ms
  
  // If they're already within a valid week range, verify they're Sunday-Saturday
  // Otherwise, recalculate from weekStart
  let correctedWeekStart: Date
  let correctedWeekEnd: Date
  
  if (weekEndTime - weekStartTime <= weekDuration) {
    // Dates are already within a week - just ensure they're Sunday-Saturday
    correctedWeekStart = getWeekStart(weekStart)
    // Use the same week as weekStart for weekEnd calculation
    correctedWeekEnd = getWeekEnd(weekStart)
  } else {
    // Dates span more than a week - recalculate from weekStart
    correctedWeekStart = getWeekStart(weekStart)
    correctedWeekEnd = getWeekEnd(weekStart)
  }
  
  // Final verification
  const finalWeekStartTime = correctedWeekStart.getTime()
  const finalWeekEndTime = correctedWeekEnd.getTime()
  const finalWeekDuration = 7 * 24 * 60 * 60 * 1000 - 1
  
  if (finalWeekEndTime - finalWeekStartTime > finalWeekDuration) {
    throw new Error(`Invalid week boundaries: weekEnd is more than 7 days after weekStart`)
  }
  
  // Normalize to UTC for database storage
  return {
    weekStart: normalizeWeekStartToUTC(correctedWeekStart),
    weekEnd: normalizeWeekEndToUTC(correctedWeekEnd)
  }
}

/**
 * Validates that a date falls within the specified week boundaries
 */
export function validateDateInWeek(date: Date, weekStart: Date, weekEnd: Date): void {
  const dateTime = date.getTime()
  const weekStartTime = weekStart.getTime()
  const weekEndTime = weekEnd.getTime()
  
  if (dateTime < weekStartTime || dateTime > weekEndTime) {
    throw new Error(
      `Date ${date.toISOString()} is outside week boundaries ` +
      `(${weekStart.toISOString()} to ${weekEnd.toISOString()})`
    )
  }
}

/**
 * Zod schema for date string validation
 */
export const dateStringSchema = z.string().transform((val) => {
  try {
    return parseDateString(val)
  } catch (error) {
    throw new z.ZodError([
      {
        code: 'custom',
        path: [],
        message: error instanceof Error ? error.message : 'Invalid date format'
      }
    ])
  }
})

/**
 * Zod schema for optional date string validation
 */
export const optionalDateStringSchema = z.string().optional().transform((val) => {
  if (!val) return undefined
  try {
    return parseDateString(val)
  } catch (error) {
    throw new z.ZodError([
      {
        code: 'custom',
        path: [],
        message: error instanceof Error ? error.message : 'Invalid date format'
      }
    ])
  }
})

/**
 * Zod schema for nullable date string validation
 */
export const nullableDateStringSchema = z.string().nullable().transform((val) => {
  if (!val) return null
  try {
    return parseDateString(val)
  } catch (error) {
    throw new z.ZodError([
      {
        code: 'custom',
        path: [],
        message: error instanceof Error ? error.message : 'Invalid date format'
      }
    ])
  }
})

/**
 * Validates date range query parameters
 */
export function validateDateRangeQuery(startDate: string | null, endDate: string | null): {
  start: Date | undefined
  end: Date | undefined
} {
  if (!startDate && !endDate) {
    return { start: undefined, end: undefined }
  }
  
  if (startDate && !endDate) {
    throw new Error('endDate is required when startDate is provided')
  }
  
  if (!startDate && endDate) {
    throw new Error('startDate is required when endDate is provided')
  }
  
  const start = parseDateString(startDate!)
  const end = parseDateString(endDate!)
  
  if (start > end) {
    throw new Error('startDate must be before or equal to endDate')
  }
  
  // Validate reasonable date range (not too far in past/future)
  validateDateRange(start, 365, 30)
  validateDateRange(end, 365, 30)
  
  return { start, end }
}

/**
 * Gets date-only string (YYYY-MM-DD) from a Date object
 * Uses local date components to avoid timezone issues
 */
export function getDateOnlyString(date: Date): string {
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

