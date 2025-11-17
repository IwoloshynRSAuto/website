/**
 * Analytics service layer - business logic for metrics and analytics
 * Server-only code
 */

import { prisma } from '@/lib/prisma'
import { AnalyticsFilter } from './schemas'

export class AnalyticsService {
  /**
   * Get hours logged metrics
   */
  static async getHoursLogged(filters: AnalyticsFilter = {}) {
    const where: any = {}

    if (filters.userId) {
      where.userId = filters.userId
    }

    if (filters.jobId) {
      where.jobId = filters.jobId
    }

    if (filters.startDate || filters.endDate) {
      where.date = {}
      if (filters.startDate) {
        where.date.gte = new Date(filters.startDate)
      }
      if (filters.endDate) {
        where.date.lte = new Date(filters.endDate)
      }
    } else if (filters.year) {
      const startDate = new Date(filters.year, filters.month ? filters.month - 1 : 0, 1)
      const endDate = filters.month
        ? new Date(filters.year, filters.month, 0, 23, 59, 59, 999)
        : new Date(filters.year, 11, 31, 23, 59, 59, 999)
      where.date = {
        gte: startDate,
        lte: endDate,
      }
    }

    // Get time entries
    const timeEntries = await prisma.timeEntry.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        job: {
          select: {
            id: true,
            jobNumber: true,
            title: true,
          },
        },
        laborCode: {
          select: {
            id: true,
            code: true,
            description: true,
          },
        },
      },
    })

    // Calculate totals
    const totalRegularHours = timeEntries.reduce((sum, entry) => sum + (entry.regularHours || 0), 0)
    const totalOvertimeHours = timeEntries.reduce((sum, entry) => sum + (entry.overtimeHours || 0), 0)
    const totalHours = totalRegularHours + totalOvertimeHours

    // Group by user
    const byUser = timeEntries.reduce((acc, entry) => {
      const userId = entry.userId || 'unknown'
      if (!acc[userId]) {
        acc[userId] = {
          user: entry.user,
          regularHours: 0,
          overtimeHours: 0,
          totalHours: 0,
          entries: 0,
        }
      }
      acc[userId].regularHours += entry.regularHours || 0
      acc[userId].overtimeHours += entry.overtimeHours || 0
      acc[userId].totalHours += (entry.regularHours || 0) + (entry.overtimeHours || 0)
      acc[userId].entries += 1
      return acc
    }, {} as Record<string, any>)

    // Group by labor code
    const byLaborCode = timeEntries.reduce((acc, entry) => {
      const codeId = entry.laborCodeId || 'unknown'
      if (!acc[codeId]) {
        acc[codeId] = {
          laborCode: entry.laborCode,
          regularHours: 0,
          overtimeHours: 0,
          totalHours: 0,
          entries: 0,
        }
      }
      acc[codeId].regularHours += entry.regularHours || 0
      acc[codeId].overtimeHours += entry.overtimeHours || 0
      acc[codeId].totalHours += (entry.regularHours || 0) + (entry.overtimeHours || 0)
      acc[codeId].entries += 1
      return acc
    }, {} as Record<string, any>)

    // Group by job
    const byJob = timeEntries.reduce((acc, entry) => {
      const jobId = entry.jobId
      if (!acc[jobId]) {
        acc[jobId] = {
          job: entry.job,
          regularHours: 0,
          overtimeHours: 0,
          totalHours: 0,
          entries: 0,
        }
      }
      acc[jobId].regularHours += entry.regularHours || 0
      acc[jobId].overtimeHours += entry.overtimeHours || 0
      acc[jobId].totalHours += (entry.regularHours || 0) + (entry.overtimeHours || 0)
      acc[jobId].entries += 1
      return acc
    }, {} as Record<string, any>)

    return {
      totalRegularHours,
      totalOvertimeHours,
      totalHours,
      totalEntries: timeEntries.length,
      byUser: Object.values(byUser),
      byLaborCode: Object.values(byLaborCode),
      byJob: Object.values(byJob),
    }
  }

  /**
   * Get quoted vs actual metrics
   */
  static async getQuotedVsActual(filters: AnalyticsFilter = {}) {
    const where: any = {}

    if (filters.jobId) {
      where.jobId = filters.jobId
    }

    if (filters.customerId) {
      where.customerId = filters.customerId
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {}
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate)
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate)
      }
    } else if (filters.year) {
      const startDate = new Date(filters.year, filters.month ? filters.month - 1 : 0, 1)
      const endDate = filters.month
        ? new Date(filters.year, filters.month, 0, 23, 59, 59, 999)
        : new Date(filters.year, 11, 31, 23, 59, 59, 999)
      where.createdAt = {
        gte: startDate,
        lte: endDate,
      }
    }

    // Get jobs with time entries and quoted labor
    const jobs = await prisma.job.findMany({
      where,
      include: {
        timeEntries: {
          include: {
            laborCode: true,
          },
        },
        quotedLabor: {
          include: {
            laborCode: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Calculate metrics per job
    const jobMetrics = jobs.map((job) => {
      // Actual hours
      const actualHours = job.timeEntries.reduce((sum, entry) => {
        return sum + (entry.regularHours || 0) + (entry.overtimeHours || 0)
      }, 0)

      // Quoted hours
      const quotedHours = job.quotedLabor.reduce((sum, labor) => {
        return sum + (labor.estimatedHours || 0)
      }, 0) || job.estimatedHours || 0

      // Actual cost
      const actualCost = job.timeEntries.reduce((sum, entry) => {
        const rate = entry.rate ? Number(entry.rate) : 0
        const hours = (entry.regularHours || 0) + (entry.overtimeHours || 0)
        return sum + rate * hours
      }, 0)

      // Quoted cost
      const quotedCost = job.quotedLabor.reduce((sum, labor) => {
        const rate = labor.laborCode.hourlyRate ? Number(labor.laborCode.hourlyRate) : 0
        return sum + rate * (labor.estimatedHours || 0)
      }, 0)

      return {
        job: {
          id: job.id,
          jobNumber: job.jobNumber,
          title: job.title,
          customer: job.customer,
        },
        quotedHours,
        actualHours,
        hoursVariance: actualHours - quotedHours,
        hoursVariancePercent: quotedHours > 0 ? ((actualHours - quotedHours) / quotedHours) * 100 : 0,
        quotedCost,
        actualCost,
        costVariance: actualCost - quotedCost,
        costVariancePercent: quotedCost > 0 ? ((actualCost - quotedCost) / quotedCost) * 100 : 0,
      }
    })

    // Aggregate totals
    const totals = jobMetrics.reduce(
      (acc, metric) => {
        acc.quotedHours += metric.quotedHours
        acc.actualHours += metric.actualHours
        acc.quotedCost += metric.quotedCost
        acc.actualCost += metric.actualCost
        return acc
      },
      {
        quotedHours: 0,
        actualHours: 0,
        quotedCost: 0,
        actualCost: 0,
      }
    )

    totals.hoursVariance = totals.actualHours - totals.quotedHours
    totals.hoursVariancePercent = totals.quotedHours > 0 ? (totals.hoursVariance / totals.quotedHours) * 100 : 0
    totals.costVariance = totals.actualCost - totals.quotedCost
    totals.costVariancePercent = totals.quotedCost > 0 ? (totals.costVariance / totals.quotedCost) * 100 : 0

    return {
      totals,
      byJob: jobMetrics,
    }
  }

  /**
   * Get job profitability metrics
   */
  static async getJobProfitability(filters: AnalyticsFilter = {}) {
    const where: any = {}

    if (filters.customerId) {
      where.customerId = filters.customerId
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {}
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate)
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate)
      }
    } else if (filters.year) {
      const startDate = new Date(filters.year, filters.month ? filters.month - 1 : 0, 1)
      const endDate = filters.month
        ? new Date(filters.year, filters.month, 0, 23, 59, 59, 999)
        : new Date(filters.year, 11, 31, 23, 59, 59, 999)
      where.createdAt = {
        gte: startDate,
        lte: endDate,
      }
    }

    // Get jobs with costs
    const jobs = await prisma.job.findMany({
      where,
      include: {
        timeEntries: {
          include: {
            laborCode: true,
          },
        },
        expenseReports: {
          where: {
            status: 'APPROVED',
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Calculate profitability per job
    const jobProfitability = jobs.map((job) => {
      // Revenue (estimated cost)
      const revenue = job.estimatedCost ? Number(job.estimatedCost) : 0

      // Labor cost
      const laborCost = job.timeEntries.reduce((sum, entry) => {
        const rate = entry.rate ? Number(entry.rate) : 0
        const hours = (entry.regularHours || 0) + (entry.overtimeHours || 0)
        return sum + rate * hours
      }, 0)

      // Material cost (from expense reports)
      const materialCost = job.expenseReports.reduce((sum, expense) => {
        return sum + expense.amount
      }, 0)

      // Total cost
      const totalCost = laborCost + materialCost

      // Profit
      const profit = revenue - totalCost
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0

      return {
        job: {
          id: job.id,
          jobNumber: job.jobNumber,
          title: job.title,
          customer: job.customer,
        },
        revenue,
        laborCost,
        materialCost,
        totalCost,
        profit,
        profitMargin,
      }
    })

    // Aggregate totals
    const totals = jobProfitability.reduce(
      (acc, job) => {
        acc.revenue += job.revenue
        acc.laborCost += job.laborCost
        acc.materialCost += job.materialCost
        acc.totalCost += job.totalCost
        acc.profit += job.profit
        return acc
      },
      {
        revenue: 0,
        laborCost: 0,
        materialCost: 0,
        totalCost: 0,
        profit: 0,
      }
    )

    totals.profitMargin = totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0

    return {
      totals,
      byJob: jobProfitability,
    }
  }

  /**
   * Get win/loss rate metrics
   */
  static async getWinLossRate(filters: AnalyticsFilter = {}) {
    const where: any = {}

    if (filters.customerId) {
      where.customerId = filters.customerId
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {}
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate)
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate)
      }
    } else if (filters.year) {
      const startDate = new Date(filters.year, filters.month ? filters.month - 1 : 0, 1)
      const endDate = filters.month
        ? new Date(filters.year, filters.month, 0, 23, 59, 59, 999)
        : new Date(filters.year, 11, 31, 23, 59, 59, 999)
      where.createdAt = {
        gte: startDate,
        lte: endDate,
      }
    }

    // Get quotes
    const quotes = await prisma.quote.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Calculate metrics
    const total = quotes.length
    const won = quotes.filter((q) => q.status === 'WON').length
    const lost = quotes.filter((q) => q.status === 'LOST').length
    const sent = quotes.filter((q) => q.status === 'SENT').length
    const draft = quotes.filter((q) => q.status === 'DRAFT').length

    const winRate = total > 0 ? (won / total) * 100 : 0
    const lossRate = total > 0 ? (lost / total) * 100 : 0

    // Total quoted value
    const totalQuoted = quotes.reduce((sum, q) => sum + (q.amount || 0), 0)
    const wonValue = quotes.filter((q) => q.status === 'WON').reduce((sum, q) => sum + (q.amount || 0), 0)
    const lostValue = quotes.filter((q) => q.status === 'LOST').reduce((sum, q) => sum + (q.amount || 0), 0)

    // Average quote value
    const avgQuoteValue = total > 0 ? totalQuoted / total : 0
    const avgWonValue = won > 0 ? wonValue / won : 0

    // Group by customer
    const byCustomer = quotes.reduce((acc, quote) => {
      const customerId = quote.customerId || 'unknown'
      if (!acc[customerId]) {
        acc[customerId] = {
          customer: quote.customer,
          total: 0,
          won: 0,
          lost: 0,
          sent: 0,
          draft: 0,
          totalValue: 0,
          wonValue: 0,
        }
      }
      acc[customerId].total += 1
      if (quote.status === 'WON') acc[customerId].won += 1
      if (quote.status === 'LOST') acc[customerId].lost += 1
      if (quote.status === 'SENT') acc[customerId].sent += 1
      if (quote.status === 'DRAFT') acc[customerId].draft += 1
      acc[customerId].totalValue += quote.amount || 0
      if (quote.status === 'WON') acc[customerId].wonValue += quote.amount || 0
      return acc
    }, {} as Record<string, any>)

    // Calculate win rates per customer
    Object.values(byCustomer).forEach((customer: any) => {
      customer.winRate = customer.total > 0 ? (customer.won / customer.total) * 100 : 0
    })

    return {
      total,
      won,
      lost,
      sent,
      draft,
      winRate,
      lossRate,
      totalQuoted,
      wonValue,
      lostValue,
      avgQuoteValue,
      avgWonValue,
      byCustomer: Object.values(byCustomer),
    }
  }

  /**
   * Get BOM variance metrics
   */
  static async getBOMVariance(filters: AnalyticsFilter = {}) {
    // Get BOMs linked to jobs via quotes
    let quoteIds: string[] = []
    if (filters.jobId) {
      const job = await prisma.job.findUnique({
        where: { id: filters.jobId },
        select: { quoteId: true },
      })
      if (job?.quoteId) {
        quoteIds = [job.quoteId]
      }
    } else {
      // Get all quotes that have jobs
      const quotes = await prisma.quote.findMany({
        where: {
          job: {
            isNot: null,
          },
        },
        select: { id: true },
      })
      quoteIds = quotes.map((q) => q.id)
    }

    const boms = await prisma.bOM.findMany({
      where: quoteIds.length > 0
        ? {
            linkedQuoteId: {
              in: quoteIds,
            },
          }
        : {},
      include: {
        parts: {
          include: {
            originalPart: {
              select: {
                id: true,
                partNumber: true,
                manufacturer: true,
                description: true,
                purchasePrice: true,
              },
            },
          },
        },
        linkedQuote: {
          include: {
            job: {
              select: {
                id: true,
                jobNumber: true,
                title: true,
              },
            },
          },
        },
      },
    })

    // Calculate variance per BOM
    const bomVariance = boms.map((bom) => {
      // Quoted quantities and prices
      const quotedParts = bom.parts.map((bomPart) => ({
        part: bomPart.originalPart || {
          id: bomPart.partId,
          partNumber: bomPart.partNumber,
          manufacturer: bomPart.manufacturer,
          description: bomPart.description,
          purchasePrice: bomPart.purchasePrice,
        },
        quotedQuantity: bomPart.quantity,
        quotedPrice: bomPart.customerPrice ? Number(bomPart.customerPrice) : 0,
        quotedCost: bomPart.purchasePrice ? Number(bomPart.purchasePrice) : 0,
      }))

      // TODO: Compare with actual purchased quantities from Purchase Orders
      // For now, we'll just return quoted values

      const totalQuotedCost = quotedParts.reduce((sum, p) => sum + p.quotedCost * p.quotedQuantity, 0)
      const totalQuotedPrice = quotedParts.reduce((sum, p) => sum + p.quotedPrice * p.quotedQuantity, 0)

      return {
        bom: {
          id: bom.id,
          name: bom.name,
          job: bom.linkedQuote?.job,
        },
        parts: quotedParts,
        totalQuotedCost,
        totalQuotedPrice,
        margin: totalQuotedPrice - totalQuotedCost,
        marginPercent: totalQuotedPrice > 0 ? ((totalQuotedPrice - totalQuotedCost) / totalQuotedPrice) * 100 : 0,
      }
    })

    // Aggregate totals
    const totals = bomVariance.reduce(
      (acc, bom) => {
        acc.totalQuotedCost += bom.totalQuotedCost
        acc.totalQuotedPrice += bom.totalQuotedPrice
        return acc
      },
      {
        totalQuotedCost: 0,
        totalQuotedPrice: 0,
      }
    )

    totals.margin = totals.totalQuotedPrice - totals.totalQuotedCost
    totals.marginPercent = totals.totalQuotedPrice > 0 ? (totals.margin / totals.totalQuotedPrice) * 100 : 0

    return {
      totals,
      byBOM: bomVariance,
    }
  }

  /**
   * Get productivity metrics
   */
  static async getProductivity(filters: AnalyticsFilter = {}) {
    const where: any = {}

    if (filters.userId) {
      where.userId = filters.userId
    }

    if (filters.startDate || filters.endDate) {
      where.date = {}
      if (filters.startDate) {
        where.date.gte = new Date(filters.startDate)
      }
      if (filters.endDate) {
        where.date.lte = new Date(filters.endDate)
      }
    } else if (filters.year) {
      const startDate = new Date(filters.year, filters.month ? filters.month - 1 : 0, 1)
      const endDate = filters.month
        ? new Date(filters.year, filters.month, 0, 23, 59, 59, 999)
        : new Date(filters.year, 11, 31, 23, 59, 59, 999)
      where.date = {
        gte: startDate,
        lte: endDate,
      }
    }

    // Get time entries
    const timeEntries = await prisma.timeEntry.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        job: {
          select: {
            id: true,
            jobNumber: true,
            title: true,
          },
        },
      },
    })

    // Group by user and date
    const byUserAndDate = timeEntries.reduce((acc, entry) => {
      const userId = entry.userId || 'unknown'
      const dateKey = entry.date.toISOString().split('T')[0]

      if (!acc[userId]) {
        acc[userId] = {}
      }
      if (!acc[userId][dateKey]) {
        acc[userId][dateKey] = {
          user: entry.user,
          date: dateKey,
          hours: 0,
          entries: 0,
        }
      }

      acc[userId][dateKey].hours += (entry.regularHours || 0) + (entry.overtimeHours || 0)
      acc[userId][dateKey].entries += 1
      return acc
    }, {} as Record<string, Record<string, any>>)

    // Flatten and calculate averages
    const dailyProductivity = Object.values(byUserAndDate).flatMap((userData) => Object.values(userData))

    // Calculate average hours per day per user
    const avgHoursByUser = Object.entries(byUserAndDate).map(([userId, userData]) => {
      const days = Object.values(userData)
      const totalHours = days.reduce((sum: number, day: any) => sum + day.hours, 0)
      const avgHours = days.length > 0 ? totalHours / days.length : 0

      return {
        user: days[0]?.user,
        totalDays: days.length,
        totalHours,
        avgHoursPerDay: avgHours,
      }
    })

    return {
      dailyProductivity,
      avgHoursByUser,
      totalEntries: timeEntries.length,
    }
  }

  /**
   * Get comprehensive dashboard metrics
   */
  static async getDashboardMetrics(filters: AnalyticsFilter = {}) {
    const [hoursLogged, quotedVsActual, jobProfitability, winLossRate, bomVariance, productivity] = await Promise.all([
      this.getHoursLogged(filters),
      this.getQuotedVsActual(filters),
      this.getJobProfitability(filters),
      this.getWinLossRate(filters),
      this.getBOMVariance(filters),
      this.getProductivity(filters),
    ])

    return {
      hoursLogged,
      quotedVsActual,
      jobProfitability,
      winLossRate,
      bomVariance,
      productivity,
    }
  }
}

