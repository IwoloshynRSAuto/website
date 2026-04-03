/**
 * Quotes service layer - business logic for quotes
 * Server-only code
 */

import { prisma } from '@/lib/prisma'
import { CreateQuoteInput, UpdateQuoteInput, QuoteFilter } from './schemas'
import { z } from 'zod'

export class QuoteService {
  /**
   * Create a new quote from a BOM
   */
  static async createQuote(data: CreateQuoteInput, userId: string) {
    // Get the BOM
    const bom = await prisma.bOM.findUnique({
      where: { id: data.bomId },
      include: {
        parts: true,
      },
    })

    if (!bom) {
      throw new Error('BOM not found')
    }

    // Calculate quote totals
    const totalCost = bom.parts.reduce((sum, part) => {
      return sum + Number(part.purchasePrice) * part.quantity
    }, 0)
    const totalCustomerPrice = bom.parts.reduce((sum, part) => {
      return sum + Number(part.customerPrice)
    }, 0)

    // Generate quote number
    const lastQuote = await prisma.quote.findFirst({
      orderBy: { createdAt: 'desc' },
      where: {
        quoteNumber: { startsWith: 'Q' },
      },
    })
    let quoteNumber = 'Q0001'
    if (lastQuote) {
      const lastNum = parseInt(lastQuote.quoteNumber.replace('Q', ''), 10)
      if (!isNaN(lastNum)) {
        quoteNumber = `Q${String(lastNum + 1).padStart(4, '0')}`
      }
    }

    // Create quote
    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        title: data.title || `${bom.name} - Quote`,
        description: data.description || `Quote generated from BOM: ${bom.name}`,
        customerId: data.customerId || null,
        amount: totalCustomerPrice,
        status: 'DRAFT',
        quoteType: (data as any).quoteType || 'PROJECT',
        estimatedHours: data.estimatedHours || null,
        hourlyRate: data.hourlyRate || null,
        paymentTerms: (data as any).paymentTerms || null,
        validUntil: (data as any).validUntil ? new Date((data as any).validUntil) : null,
        linkedBOMs: {
          connect: { id: data.bomId },
        },
      },
      include: {
        linkedBOMs: true,
        customer: true,
      },
    })

    // Link BOM to quote
    await prisma.bOM.update({
      where: { id: data.bomId },
      data: {
        linkedQuoteId: quote.id,
      },
    })

    // Create initial revision
    await this.createRevision(quote.id, userId, quote)

    return quote
  }

  /**
   * Update a quote
   */
  static async updateQuote(id: string, data: UpdateQuoteInput, userId: string) {
    const existingQuote = await prisma.quote.findUnique({
      where: { id },
      include: {
        linkedBOMs: true,
        customer: true,
      },
    })

    if (!existingQuote) {
      throw new Error('Quote not found')
    }

    const updateData: any = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.status !== undefined) updateData.status = data.status
    if (data.amount !== undefined) updateData.amount = data.amount
    if (data.lastFollowUp !== undefined) {
      updateData.lastFollowUp = data.lastFollowUp ? new Date(data.lastFollowUp) : null
    }
    if (data.paymentTerms !== undefined) updateData.paymentTerms = data.paymentTerms
    if (data.validUntil !== undefined) {
      updateData.validUntil = data.validUntil ? new Date(data.validUntil) : null
    }
    if (data.estimatedHours !== undefined) updateData.estimatedHours = data.estimatedHours
    if (data.hourlyRate !== undefined) updateData.hourlyRate = data.hourlyRate
    if (data.laborCost !== undefined) updateData.laborCost = data.laborCost
    if (data.materialCost !== undefined) updateData.materialCost = data.materialCost
    if (data.overheadCost !== undefined) updateData.overheadCost = data.overheadCost
    if (data.profitMargin !== undefined) updateData.profitMargin = data.profitMargin

    const updatedQuote = await prisma.quote.update({
      where: { id },
      data: updateData,
      include: {
        linkedBOMs: true,
        customer: true,
        fileRecords: true,
      },
    })

    // Create revision if significant changes
    if (data.status || data.amount || data.title) {
      await this.createRevision(updatedQuote.id, userId, updatedQuote)
    }

    return updatedQuote
  }

  /**
   * Create a quote revision snapshot
   */
  static async createRevision(quoteId: string, userId: string, quoteData?: any) {
    const quote = quoteData || await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        linkedBOMs: {
          include: {
            parts: true,
          },
        },
        customer: true,
      },
    })

    if (!quote) {
      throw new Error('Quote not found')
    }

    // Get current revision count
    const lastRevision = await prisma.quoteRevision.findFirst({
      where: { quoteId },
      orderBy: { revisionNumber: 'desc' },
    })

    const revisionNumber = lastRevision ? lastRevision.revisionNumber + 1 : 1

    // Create revision snapshot
    await prisma.quoteRevision.create({
      data: {
        quoteId,
        revisionNumber,
        createdById: userId,
        data: {
          quoteNumber: quote.quoteNumber,
          title: quote.title,
          description: quote.description,
          status: quote.status,
          amount: quote.amount,
          customerId: quote.customerId,
          customerName: quote.customer?.name,
          estimatedHours: quote.estimatedHours,
          hourlyRate: quote.hourlyRate,
          laborCost: quote.laborCost,
          materialCost: quote.materialCost,
          overheadCost: quote.overheadCost,
          profitMargin: quote.profitMargin,
          paymentTerms: quote.paymentTerms,
          validUntil: quote.validUntil,
          bomParts: quote.linkedBOMs?.[0]?.parts?.map((part: any) => ({
            partNumber: part.partNumber,
            quantity: part.quantity,
            purchasePrice: part.purchasePrice,
            customerPrice: part.customerPrice,
          })) || [],
        },
      },
    })

    return { revisionNumber }
  }

  /**
   * Get quotes with filters
   */
  static async getQuotes(filters: QuoteFilter = {}) {
    const where: any = {}

    if (filters.status) {
      where.status = filters.status
    }

    if (filters.customerId) {
      where.customerId = filters.customerId
    }

    if (filters.search) {
      where.OR = [
        { quoteNumber: { contains: filters.search, mode: 'insensitive' } },
        { title: { contains: filters.search, mode: 'insensitive' } },
        { customer: { name: { contains: filters.search, mode: 'insensitive' } } },
      ]
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {}
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate)
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate)
      }
    }

    return await prisma.quote.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        linkedBOMs: {
          include: {
            parts: {
              select: {
                id: true,
                quantity: true,
                purchasePrice: true,
                customerPrice: true,
              },
            },
          },
        },
        fileRecords: {
          select: {
            id: true,
            fileName: true,
            fileType: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        job: {
          select: {
            id: true,
            jobNumber: true,
            title: true,
          },
        },
        _count: {
          select: {
            fileRecords: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }


  /**
   * Get quotes with aging alerts
   * Returns quotes that haven't been updated in X days or are past their validUntil date
   */
  static async getAgingQuotes(agingDays: number = 30) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - agingDays)

    const quotes = await prisma.quote.findMany({
      where: {
        OR: [
          {
            // Quotes not updated in X days
            updatedAt: {
              lt: cutoffDate,
            },
            status: {
              in: ['DRAFT', 'SENT'],
            },
          },
          {
            // Quotes past validUntil date
            validUntil: {
              lt: new Date(),
            },
            status: {
              in: ['DRAFT', 'SENT'],
            },
          },
        ],
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        linkedBOMs: true,
      },
      orderBy: {
        updatedAt: 'asc',
      },
    })

    // Calculate days since last update
    return quotes.map((quote) => {
      const daysSinceUpdate = Math.floor(
        (new Date().getTime() - quote.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
      )
      const isExpired = quote.validUntil && quote.validUntil < new Date()
      
      return {
        ...quote,
        daysSinceUpdate,
        isExpired,
        agingAlert: isExpired
          ? 'EXPIRED'
          : daysSinceUpdate >= agingDays
          ? 'AGING'
          : 'OK',
      }
    })
  }

  /**
   * Get estimated labor per discipline for a quote
   * Aggregates labor estimates by discipline/labor code
   */
  static async getEstimatedLaborPerDiscipline(quoteId: string) {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        job: {
          include: {
            quotedLabor: {
              include: {
                laborCode: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    category: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!quote) {
      throw new Error('Quote not found')
    }

    // If quote has been converted to job, get labor estimates from job
    if (quote.job && quote.job.quotedLabor) {
      const laborByDiscipline = quote.job.quotedLabor.reduce(
        (acc, estimate) => {
          const discipline = estimate.laborCode.category || 'Other'
          if (!acc[discipline]) {
            acc[discipline] = {
              discipline,
              totalHours: 0,
              estimates: [],
            }
          }
          acc[discipline].totalHours += estimate.estimatedHours
          acc[discipline].estimates.push({
            laborCode: estimate.laborCode.code,
            laborName: estimate.laborCode.name,
            hours: estimate.estimatedHours,
          })
          return acc
        },
        {} as Record<
          string,
          {
            discipline: string
            totalHours: number
            estimates: Array<{
              laborCode: string
              laborName: string
              hours: number
            }>
          }
        >
      )

      return Object.values(laborByDiscipline)
    }

    // If quote has estimatedHours but no job yet, return a summary
    if (quote.estimatedHours) {
      return [
        {
          discipline: 'Project Phase',
          totalHours: quote.estimatedHours,
          estimates: [
            {
              laborCode: 'EST',
              laborName: 'Estimated Hours',
              hours: quote.estimatedHours,
            },
          ],
        },
      ]
    }

    return []
  }
}

