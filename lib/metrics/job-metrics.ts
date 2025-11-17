/**
 * Job Metrics Service
 * Calculates job-specific metrics: profitability, variance, burn-down, etc.
 */

import { prisma } from '@/lib/prisma'

export interface JobMetricsFilters {
  jobId?: string
  customerId?: string
  startDate?: Date
  endDate?: Date
  year?: number
  month?: number
}

export interface JobMetrics {
  jobId: string
  jobNumber: string
  title: string
  quotedVsActual: {
    quotedCost: number
    actualCost: number
    variance: number
    variancePercent: number
    quotedHours: number
    actualHours: number
    hoursVariance: number
    hoursVariancePercent: number
  }
  laborBurnDown: {
    estimatedHours: number
    actualHours: number
    remainingHours: number
    completionPercent: number
    hoursByLaborCode: Array<{
      laborCode: string
      estimated: number
      actual: number
      variance: number
    }>
  }
  bomVariance: {
    quotedCost: number
    purchasedCost: number
    variance: number
    variancePercent: number
    items: Array<{
      partNumber: string
      description: string
      quotedQty: number
      purchasedQty: number
      quotedPrice: number
      purchasedPrice: number
      variance: number
    }>
  }
  scheduleVariance: {
    estimatedStart: Date | null
    estimatedEnd: Date | null
    actualStart: Date | null
    actualEnd: Date | null
    estimatedDuration: number // days
    actualDuration: number | null // days
    variance: number | null // days
    onSchedule: boolean
  }
  profitability: {
    revenue: number // Estimated cost
    laborCost: number
    materialCost: number
    totalCost: number
    profit: number
    profitMargin: number // percentage
  }
}

export class JobMetricsService {
  /**
   * Get comprehensive metrics for a job
   */
  static async getJobMetrics(jobId: string): Promise<JobMetrics> {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        timeEntries: {
          include: {
            laborCode: true,
            user: {
              select: {
                id: true,
                name: true,
                wage: true,
              },
            },
          },
        },
        quotedLabor: {
          include: {
            laborCode: true,
          },
        },
        linkedBOMs: {
          include: {
            parts: true,
          },
        },
        purchaseOrders: {
          include: {
            items: {
              include: {
                part: true,
              },
            },
          },
        },
        milestones: true,
      },
    })

    if (!job) {
      throw new Error('Job not found')
    }

    // Calculate quoted vs actual cost and hours
    const quotedHours = job.estimatedHours || 0
    const actualHours = job.timeEntries.reduce((sum, entry) => {
      return sum + (entry.regularHours || 0) + (entry.overtimeHours || 0)
    }, 0)

    // Calculate labor cost
    const laborCost = job.timeEntries.reduce((sum, entry) => {
      const userWage = entry.user?.wage ? Number(entry.user.wage) : 0
      const hours = (entry.regularHours || 0) + (entry.overtimeHours || 0)
      return sum + (hours * userWage)
    }, 0)

    const quotedCost = job.estimatedCost || 0
    const hoursVariance = actualHours - quotedHours
    const hoursVariancePercent = quotedHours > 0 ? (hoursVariance / quotedHours) * 100 : 0

    // Calculate BOM variance
    let quotedBOMCost = 0
    let purchasedBOMCost = 0
    const bomItems: JobMetrics['bomVariance']['items'] = []

    // Get quoted BOM costs
    job.linkedBOMs.forEach(bom => {
      bom.parts.forEach(part => {
        quotedBOMCost += part.purchasePrice * part.quantity
      })
    })

    // Get purchased costs from POs
    job.purchaseOrders.forEach(po => {
      po.items.forEach(item => {
        purchasedBOMCost += item.totalPrice
        if (item.part) {
          bomItems.push({
            partNumber: item.part.partNumber,
            description: item.description,
            quotedQty: 0, // Would need to match from BOM
            purchasedQty: item.quantity,
            quotedPrice: 0,
            purchasedPrice: item.unitPrice,
            variance: item.totalPrice,
          })
        }
      })
    })

    const bomVariance = purchasedBOMCost - quotedBOMCost
    const bomVariancePercent = quotedBOMCost > 0 ? (bomVariance / quotedBOMCost) * 100 : 0

    // Calculate schedule variance
    const estimatedStart = job.startDate
    const estimatedEnd = job.endDate
    const actualStart = job.milestones.find(m => m.actualStartDate)?.actualStartDate || null
    const actualEnd = job.status === 'COMPLETED' ? job.updatedAt : null

    const estimatedDuration = estimatedStart && estimatedEnd
      ? Math.ceil((estimatedEnd.getTime() - estimatedStart.getTime()) / (1000 * 60 * 60 * 24))
      : 0

    const actualDuration = actualStart && actualEnd
      ? Math.ceil((actualEnd.getTime() - actualStart.getTime()) / (1000 * 60 * 60 * 24))
      : null

    const scheduleVariance = actualDuration !== null && estimatedDuration > 0
      ? actualDuration - estimatedDuration
      : null

    const onSchedule = scheduleVariance !== null ? Math.abs(scheduleVariance) <= 7 : true // Within 7 days

    // Calculate profitability
    const materialCost = purchasedBOMCost
    const totalCost = laborCost + materialCost
    const revenue = quotedCost
    const profit = revenue - totalCost
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0

    // Labor burn-down by labor code
    const laborCodeMap = new Map<string, { estimated: number; actual: number }>()
    
    // Add estimated hours
    job.quotedLabor.forEach(estimate => {
      const key = estimate.laborCode.code
      laborCodeMap.set(key, {
        estimated: estimate.estimatedHours,
        actual: 0,
      })
    })

    // Add actual hours
    job.timeEntries.forEach(entry => {
      if (entry.laborCode) {
        const key = entry.laborCode.code
        const existing = laborCodeMap.get(key) || { estimated: 0, actual: 0 }
        existing.actual += (entry.regularHours || 0) + (entry.overtimeHours || 0)
        laborCodeMap.set(key, existing)
      }
    })

    const hoursByLaborCode = Array.from(laborCodeMap.entries()).map(([code, data]) => ({
      laborCode: code,
      estimated: data.estimated,
      actual: data.actual,
      variance: data.actual - data.estimated,
    }))

    const remainingHours = Math.max(0, quotedHours - actualHours)
    const completionPercent = quotedHours > 0 ? (actualHours / quotedHours) * 100 : 0

    return {
      jobId: job.id,
      jobNumber: job.jobNumber,
      title: job.title,
      quotedVsActual: {
        quotedCost,
        actualCost: totalCost,
        variance: totalCost - quotedCost,
        variancePercent: quotedCost > 0 ? ((totalCost - quotedCost) / quotedCost) * 100 : 0,
        quotedHours,
        actualHours,
        hoursVariance,
        hoursVariancePercent,
      },
      laborBurnDown: {
        estimatedHours: quotedHours,
        actualHours,
        remainingHours,
        completionPercent,
        hoursByLaborCode,
      },
      bomVariance: {
        quotedCost: quotedBOMCost,
        purchasedCost: purchasedBOMCost,
        variance: bomVariance,
        variancePercent: bomVariancePercent,
        items: bomItems,
      },
      scheduleVariance: {
        estimatedStart,
        estimatedEnd,
        actualStart,
        actualEnd,
        estimatedDuration,
        actualDuration,
        variance: scheduleVariance,
        onSchedule,
      },
      profitability: {
        revenue,
        laborCost,
        materialCost,
        totalCost,
        profit,
        profitMargin,
      },
    }
  }

  /**
   * Get metrics for all jobs
   */
  static async getAllJobsMetrics(filters: JobMetricsFilters = {}) {
    const where: any = {}
    if (filters.customerId) where.customerId = filters.customerId
    if (filters.startDate || filters.endDate) {
      where.createdAt = {}
      if (filters.startDate) where.createdAt.gte = filters.startDate
      if (filters.endDate) where.createdAt.lte = filters.endDate
    } else if (filters.year) {
      const startDate = new Date(filters.year, filters.month ? filters.month - 1 : 0, 1)
      const endDate = filters.month
        ? new Date(filters.year, filters.month, 0, 23, 59, 59, 999)
        : new Date(filters.year, 11, 31, 23, 59, 59, 999)
      where.createdAt = { gte: startDate, lte: endDate }
    }

    const jobs = await prisma.job.findMany({
      where,
      select: { id: true },
    })

    const metrics = await Promise.all(
      jobs.map(job => this.getJobMetrics(job.id).catch(err => {
        console.error(`Error getting metrics for job ${job.id}:`, err)
        return null
      }))
    )

    return metrics.filter(m => m !== null) as JobMetrics[]
  }
}

