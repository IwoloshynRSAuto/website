/**
 * Quote Metrics Service
 * Calculates quote-specific metrics: win/loss, profitability, turnaround, etc.
 */

import { prisma } from '@/lib/prisma'

export interface QuoteMetricsFilters {
  customerId?: string
  startDate?: Date
  endDate?: Date
  year?: number
  month?: number
}

export interface QuoteMetrics {
  winLossRate: {
    total: number
    won: number
    lost: number
    sent: number
    draft: number
    winRate: number // percentage
    lossRate: number // percentage
  }
  profitPerJob: {
    totalQuoted: number
    totalWon: number
    totalProfit: number
    averageQuoteValue: number
    averageWonValue: number
    averageProfit: number
  }
  turnaround: {
    averageDays: number
    fastestDays: number
    slowestDays: number
    byStatus: {
      won: number
      lost: number
      sent: number
    }
  }
  jobTypeAnalysis: {
    mostProfitable: Array<{
      quoteType: string
      count: number
      totalValue: number
      averageValue: number
      winRate: number
    }>
    leastProfitable: Array<{
      quoteType: string
      count: number
      totalValue: number
      averageValue: number
      winRate: number
    }>
  }
  lostReasons: Array<{
    reason: string
    count: number
    totalValue: number
    percentage: number
  }>
}

export class QuoteMetricsService {
  /**
   * Get comprehensive quote metrics
   */
  static async getQuoteMetrics(filters: QuoteMetricsFilters = {}): Promise<QuoteMetrics> {
    // Build date filter
    let dateFilter: any = {}
    if (filters.startDate || filters.endDate) {
      dateFilter.createdAt = {}
      if (filters.startDate) dateFilter.createdAt.gte = filters.startDate
      if (filters.endDate) dateFilter.createdAt.lte = filters.endDate
    } else if (filters.year) {
      const startDate = new Date(filters.year, filters.month ? filters.month - 1 : 0, 1)
      const endDate = filters.month
        ? new Date(filters.year, filters.month, 0, 23, 59, 59, 999)
        : new Date(filters.year, 11, 31, 23, 59, 59, 999)
      dateFilter.createdAt = { gte: startDate, lte: endDate }
    }

    if (filters.customerId) {
      dateFilter.customerId = filters.customerId
    }

    const quotes = await prisma.quote.findMany({
      where: dateFilter,
      include: {
        lostReason: true,
        job: {
          include: {
            timeEntries: {
              include: {
                user: {
                  select: {
                    wage: true,
                  },
                },
              },
            },
            purchaseOrders: {
              include: {
                items: true,
              },
            },
          },
        },
      },
    })

    // Calculate win/loss rates
    const total = quotes.length
    const won = quotes.filter(q => q.status === 'WON').length
    const lost = quotes.filter(q => q.status === 'LOST').length
    const sent = quotes.filter(q => q.status === 'SENT').length
    const draft = quotes.filter(q => q.status === 'DRAFT').length
    const winRate = total > 0 ? (won / total) * 100 : 0
    const lossRate = total > 0 ? (lost / total) * 100 : 0

    // Calculate profit per job
    const wonQuotes = quotes.filter(q => q.status === 'WON' && q.job)
    const totalQuoted = quotes.reduce((sum, q) => sum + (q.amount || 0), 0)
    const totalWon = wonQuotes.reduce((sum, q) => sum + (q.amount || 0), 0)

    let totalProfit = 0
    wonQuotes.forEach(quote => {
      if (quote.job) {
        const laborCost = quote.job.timeEntries.reduce((sum, entry) => {
          const wage = entry.user?.wage ? Number(entry.user.wage) : 0
          const hours = (entry.regularHours || 0) + (entry.overtimeHours || 0)
          return sum + (hours * wage)
        }, 0)

        const materialCost = quote.job.purchaseOrders.reduce((sum, po) => {
          return sum + po.items.reduce((itemSum, item) => itemSum + item.totalPrice, 0)
        }, 0)

        const totalCost = laborCost + materialCost
        const profit = (quote.amount || 0) - totalCost
        totalProfit += profit
      }
    })

    const averageQuoteValue = total > 0 ? totalQuoted / total : 0
    const averageWonValue = wonQuotes.length > 0 ? totalWon / wonQuotes.length : 0
    const averageProfit = wonQuotes.length > 0 ? totalProfit / wonQuotes.length : 0

    // Calculate turnaround time
    const turnaroundTimes: number[] = []
    const turnaroundByStatus = { won: 0, lost: 0, sent: 0 }
    let wonCount = 0, lostCount = 0, sentCount = 0

    quotes.forEach(quote => {
      if (quote.validUntil && quote.createdAt) {
        const days = Math.ceil((quote.validUntil.getTime() - quote.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        turnaroundTimes.push(days)
        
        if (quote.status === 'WON') {
          turnaroundByStatus.won += days
          wonCount++
        } else if (quote.status === 'LOST') {
          turnaroundByStatus.lost += days
          lostCount++
        } else if (quote.status === 'SENT') {
          turnaroundByStatus.sent += days
          sentCount++
        }
      }
    })

    const averageDays = turnaroundTimes.length > 0
      ? turnaroundTimes.reduce((sum, d) => sum + d, 0) / turnaroundTimes.length
      : 0
    const fastestDays = turnaroundTimes.length > 0 ? Math.min(...turnaroundTimes) : 0
    const slowestDays = turnaroundTimes.length > 0 ? Math.max(...turnaroundTimes) : 0

    if (wonCount > 0) turnaroundByStatus.won /= wonCount
    if (lostCount > 0) turnaroundByStatus.lost /= lostCount
    if (sentCount > 0) turnaroundByStatus.sent /= sentCount

    // Analyze by job type
    const typeMap = new Map<string, { count: number; totalValue: number; won: number; wonValue: number }>()
    quotes.forEach(quote => {
      const type = quote.quoteType || 'OTHER'
      const existing = typeMap.get(type) || { count: 0, totalValue: 0, won: 0, wonValue: 0 }
      existing.count++
      existing.totalValue += quote.amount || 0
      if (quote.status === 'WON') {
        existing.won++
        existing.wonValue += quote.amount || 0
      }
      typeMap.set(type, existing)
    })

    const jobTypeAnalysis = Array.from(typeMap.entries()).map(([type, data]) => ({
      quoteType: type,
      count: data.count,
      totalValue: data.totalValue,
      averageValue: data.count > 0 ? data.totalValue / data.count : 0,
      winRate: data.count > 0 ? (data.won / data.count) * 100 : 0,
    })).sort((a, b) => b.averageValue - a.averageValue)

    const mostProfitable = jobTypeAnalysis.slice(0, 5)
    const leastProfitable = jobTypeAnalysis.slice(-5).reverse()

    // Analyze lost reasons
    const lostQuotes = quotes.filter(q => q.status === 'LOST')
    const reasonMap = new Map<string, number>()
    let totalLostValue = 0

    lostQuotes.forEach(quote => {
      const reason = quote.lostReason?.reason || 'OTHER'
      reasonMap.set(reason, (reasonMap.get(reason) || 0) + 1)
      totalLostValue += quote.amount || 0
    })

    const lostReasons = Array.from(reasonMap.entries()).map(([reason, count]) => ({
      reason,
      count,
      totalValue: lostQuotes
        .filter(q => (q.lostReason?.reason || 'OTHER') === reason)
        .reduce((sum, q) => sum + (q.amount || 0), 0),
      percentage: lostQuotes.length > 0 ? (count / lostQuotes.length) * 100 : 0,
    })).sort((a, b) => b.count - a.count)

    return {
      winLossRate: {
        total,
        won,
        lost,
        sent,
        draft,
        winRate,
        lossRate,
      },
      profitPerJob: {
        totalQuoted,
        totalWon,
        totalProfit,
        averageQuoteValue,
        averageWonValue,
        averageProfit,
      },
      turnaround: {
        averageDays,
        fastestDays,
        slowestDays,
        byStatus: turnaroundByStatus,
      },
      jobTypeAnalysis: {
        mostProfitable,
        leastProfitable,
      },
      lostReasons,
    }
  }
}

