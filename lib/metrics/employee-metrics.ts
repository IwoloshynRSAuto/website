/**
 * Employee Metrics Service
 * Calculates employee-specific metrics: hours, productivity, accuracy, etc.
 */

import { prisma } from '@/lib/prisma'

export interface EmployeeMetricsFilters {
  userId?: string
  startDate?: Date
  endDate?: Date
  year?: number
  month?: number
}

export interface EmployeeMetrics {
  totalHours: number
  regularHours: number
  overtimeHours: number
  hoursByDiscipline: Array<{
    laborCode: string
    laborCodeName: string
    hours: number
  }>
  projectsWorked: number
  projectsList: Array<{
    jobId: string
    jobNumber: string
    title: string
    hours: number
  }>
  quotedVsActual: {
    quotedHours: number
    actualHours: number
    variance: number
    variancePercent: number
    accuracy: number // Percentage accuracy (100 - abs(variancePercent))
  }
  productivity: {
    averageHoursPerDay: number
    averageHoursPerWeek: number
    billableHours: number
    nonBillableHours: number
    billablePercentage: number
  }
}

export class EmployeeMetricsService {
  /**
   * Get comprehensive metrics for an employee
   */
  static async getEmployeeMetrics(
    userId: string,
    filters: EmployeeMetricsFilters = {}
  ): Promise<EmployeeMetrics> {
    // Build date filter
    let dateFilter: any = {}
    if (filters.startDate || filters.endDate) {
      dateFilter.date = {}
      if (filters.startDate) dateFilter.date.gte = filters.startDate
      if (filters.endDate) dateFilter.date.lte = filters.endDate
    } else if (filters.year) {
      const startDate = new Date(filters.year, filters.month ? filters.month - 1 : 0, 1)
      const endDate = filters.month
        ? new Date(filters.year, filters.month, 0, 23, 59, 59, 999)
        : new Date(filters.year, 11, 31, 23, 59, 59, 999)
      dateFilter.date = { gte: startDate, lte: endDate }
    }

    // Get all time entries for the employee
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        userId,
        ...dateFilter,
      },
      include: {
        job: {
          select: {
            id: true,
            jobNumber: true,
            title: true,
            estimatedHours: true,
          },
        },
        laborCode: {
          select: {
            id: true,
            code: true,
            name: true,
            category: true,
          },
        },
      },
    })

    // Calculate totals
    const totalRegularHours = timeEntries.reduce((sum, entry) => sum + (entry.regularHours || 0), 0)
    const totalOvertimeHours = timeEntries.reduce((sum, entry) => sum + (entry.overtimeHours || 0), 0)
    const totalHours = totalRegularHours + totalOvertimeHours

    // Group by labor code (discipline)
    const hoursByDisciplineMap = new Map<string, { laborCode: string; laborCodeName: string; hours: number }>()
    timeEntries.forEach(entry => {
      if (entry.laborCode) {
        const key = entry.laborCode.code
        const existing = hoursByDisciplineMap.get(key) || {
          laborCode: entry.laborCode.code,
          laborCodeName: entry.laborCode.name,
          hours: 0,
        }
        existing.hours += (entry.regularHours || 0) + (entry.overtimeHours || 0)
        hoursByDisciplineMap.set(key, existing)
      }
    })
    const hoursByDiscipline = Array.from(hoursByDisciplineMap.values()).sort((a, b) => b.hours - a.hours)

    // Group by project
    const projectsMap = new Map<string, { jobId: string; jobNumber: string; title: string; hours: number }>()
    timeEntries.forEach(entry => {
      const key = entry.jobId
      const existing = projectsMap.get(key) || {
        jobId: entry.job.id,
        jobNumber: entry.job.jobNumber,
        title: entry.job.title,
        hours: 0,
      }
      existing.hours += (entry.regularHours || 0) + (entry.overtimeHours || 0)
      projectsMap.set(key, existing)
    })
    const projectsList = Array.from(projectsMap.values()).sort((a, b) => b.hours - a.hours)
    const projectsWorked = projectsMap.size

    // Calculate quoted vs actual
    const quotedVsActualMap = new Map<string, { quoted: number; actual: number }>()
    timeEntries.forEach(entry => {
      const key = entry.jobId
      const existing = quotedVsActualMap.get(key) || { quoted: 0, actual: 0 }
      existing.actual += (entry.regularHours || 0) + (entry.overtimeHours || 0)
      if (entry.job.estimatedHours) {
        existing.quoted = entry.job.estimatedHours
      }
      quotedVsActualMap.set(key, existing)
    })

    let totalQuoted = 0
    let totalActual = 0
    quotedVsActualMap.forEach(({ quoted, actual }) => {
      totalQuoted += quoted
      totalActual += actual
    })

    const variance = totalActual - totalQuoted
    const variancePercent = totalQuoted > 0 ? (variance / totalQuoted) * 100 : 0
    const accuracy = Math.max(0, 100 - Math.abs(variancePercent))

    // Calculate productivity
    const billableHours = timeEntries.filter(e => e.billable).reduce((sum, e) => sum + (e.regularHours || 0) + (e.overtimeHours || 0), 0)
    const nonBillableHours = totalHours - billableHours
    const billablePercentage = totalHours > 0 ? (billableHours / totalHours) * 100 : 0

    // Calculate average hours per day/week
    const uniqueDates = new Set(timeEntries.map(e => e.date.toISOString().split('T')[0]))
    const daysWorked = uniqueDates.size
    const averageHoursPerDay = daysWorked > 0 ? totalHours / daysWorked : 0
    const averageHoursPerWeek = averageHoursPerDay * 5 // Assuming 5-day work week

    return {
      totalHours,
      regularHours: totalRegularHours,
      overtimeHours: totalOvertimeHours,
      hoursByDiscipline,
      projectsWorked,
      projectsList,
      quotedVsActual: {
        quotedHours: totalQuoted,
        actualHours: totalActual,
        variance,
        variancePercent,
        accuracy,
      },
      productivity: {
        averageHoursPerDay,
        averageHoursPerWeek,
        billableHours,
        nonBillableHours,
        billablePercentage,
      },
    }
  }

  /**
   * Get metrics for all employees (summary)
   */
  static async getAllEmployeesMetrics(filters: EmployeeMetricsFilters = {}) {
    const employees = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true },
    })

    const metrics = await Promise.all(
      employees.map(employee => this.getEmployeeMetrics(employee.id, filters))
    )

    return employees.map((employee, index) => ({
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
      },
      metrics: metrics[index],
    }))
  }
}

