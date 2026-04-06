/**
 * Centralized date utilities for week calculations
 * Ensures consistent Sunday → Saturday week boundaries across the application
 */

import { startOfWeek, endOfWeek, format, eachDayOfInterval, addWeeks, subWeeks } from 'date-fns'

/**
 * Get the start of the week (Sunday) for a given date
 * Returns Sunday at 00:00:00
 */
export function getWeekStart(date: Date = new Date()): Date {
  return startOfWeek(date, { weekStartsOn: 0 })
}

/**
 * Get the end of the week (Saturday) for a given date
 * Returns Saturday at 23:59:59.999
 */
export function getWeekEnd(date: Date = new Date()): Date {
  const end = endOfWeek(date, { weekStartsOn: 0 })
  // Set to end of day (23:59:59.999)
  end.setHours(23, 59, 59, 999)
  return end
}

/**
 * Get week boundaries for a given date
 * Returns { weekStart: Date, weekEnd: Date }
 */
export function getWeekBoundaries(date: Date = new Date()): { weekStart: Date; weekEnd: Date } {
  return {
    weekStart: getWeekStart(date),
    weekEnd: getWeekEnd(date),
  }
}

/**
 * Get all days in the week (Sunday through Saturday)
 */
export function getWeekDays(date: Date = new Date()): Date[] {
  const weekStart = getWeekStart(date)
  const weekEnd = getWeekEnd(date)
  return eachDayOfInterval({ start: weekStart, end: weekEnd })
}

/**
 * Get the previous week boundaries
 */
export function getPreviousWeek(date: Date = new Date()): { weekStart: Date; weekEnd: Date } {
  const prevWeek = subWeeks(date, 1)
  return getWeekBoundaries(prevWeek)
}

/**
 * Get the next week boundaries
 */
export function getNextWeek(date: Date = new Date()): { weekStart: Date; weekEnd: Date } {
  const nextWeek = addWeeks(date, 1)
  return getWeekBoundaries(nextWeek)
}

/**
 * Format week range as string (e.g., "Nov 9 - Nov 15, 2025")
 */
export function formatWeekRange(date: Date = new Date()): string {
  const { weekStart, weekEnd } = getWeekBoundaries(date)
  const startStr = format(weekStart, 'MMM d')
  const endStr = format(weekEnd, 'MMM d, yyyy')
  return `${startStr} - ${endStr}`
}

/**
 * Check if a date falls within a specific week
 */
export function isDateInWeek(date: Date, weekDate: Date): boolean {
  const { weekStart, weekEnd } = getWeekBoundaries(weekDate)
  return date >= weekStart && date <= weekEnd
}

/**
 * Normalize weekStart to UTC for database storage
 * Converts local date to UTC midnight to avoid timezone issues
 */
export function normalizeWeekStartToUTC(date: Date): Date {
  const weekStart = getWeekStart(date)
  return new Date(Date.UTC(
    weekStart.getFullYear(),
    weekStart.getMonth(),
    weekStart.getDate(),
    0, 0, 0, 0
  ))
}

/**
 * Normalize weekEnd to UTC for database storage
 * Converts local date to UTC end of day to avoid timezone issues
 */
export function normalizeWeekEndToUTC(date: Date): Date {
  const weekEnd = getWeekEnd(date)
  return new Date(Date.UTC(
    weekEnd.getFullYear(),
    weekEnd.getMonth(),
    weekEnd.getDate(),
    23, 59, 59, 999
  ))
}

/**
 * Get week boundaries normalized to UTC for database queries
 */
export function getWeekBoundariesUTC(date: Date = new Date()): { weekStart: Date; weekEnd: Date } {
  return {
    weekStart: normalizeWeekStartToUTC(date),
    weekEnd: normalizeWeekEndToUTC(date),
  }
}


