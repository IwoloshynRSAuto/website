/**
 * Customers service layer - business logic for customers
 * Server-only code
 */

import { prisma } from '@/lib/prisma'

export class CustomerService {
  /**
   * Get customer metrics
   */
  static async getCustomerMetrics(customerId: string, year?: number) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    })

    if (!customer) {
      throw new Error('Customer not found')
    }

    const yearFilter = year || new Date().getFullYear()
    const startDate = new Date(yearFilter, 0, 1)
    const endDate = new Date(yearFilter, 11, 31, 23, 59, 59, 999)

    // Get jobs for the year
    const jobs = await prisma.job.findMany({
      where: {
        customerId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
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
      },
    })

    // Get quotes for the year
    const quotes = await prisma.quote.findMany({
      where: {
        customerId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    // Calculate metrics
    const totalHours = jobs.reduce((sum, job) => {
      const jobHours = job.timeEntries.reduce((entrySum, entry) => {
        return entrySum + (entry.regularHours || 0) + (entry.overtimeHours || 0)
      }, 0)
      return sum + jobHours
    }, 0)

    const totalRevenue = jobs.reduce((sum, job) => {
      return sum + (job.estimatedCost ? Number(job.estimatedCost) : 0)
    }, 0)

    const totalQuoted = quotes.reduce((sum, quote) => {
      return sum + (quote.amount ? Number(quote.amount) : 0)
    }, 0)

    const jobsCompleted = jobs.filter((job) => job.status === 'COMPLETED').length
    const quotesWon = quotes.filter((quote) => quote.status === 'WON').length
    const quotesTotal = quotes.length
    const winRate = quotesTotal > 0 ? (quotesWon / quotesTotal) * 100 : 0

    return {
      customer: {
        id: customer.id,
        name: customer.name,
      },
      year: yearFilter,
      totalHours,
      totalRevenue,
      totalQuoted,
      jobsCompleted,
      jobsTotal: jobs.length,
      quotesWon,
      quotesTotal,
      winRate,
    }
  }

  /**
   * Get customers with basic stats
   */
  static async getCustomersWithStats(filters?: { activeOnly?: boolean; search?: string }) {
    const where: any = {}

    if (filters?.activeOnly) {
      where.isActive = true
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        _count: {
          select: {
            jobs: true,
            quotes: true,
          },
        },
        jobs: {
          select: {
            id: true,
            status: true,
            estimatedCost: true,
          },
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        quotes: {
          select: {
            id: true,
            status: true,
            amount: true,
          },
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    })

    return customers.map((customer) => ({
      ...customer,
      activeJobs: customer.jobs.filter((j) => j.status === 'ACTIVE').length,
      totalRevenue: customer.jobs.reduce((sum, job) => {
        return sum + (job.estimatedCost ? Number(job.estimatedCost) : 0)
      }, 0),
    }))
  }
}

