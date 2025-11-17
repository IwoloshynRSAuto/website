/**
 * Part Sales service layer - business logic for part sales
 * Part sales are quotes with quoteType = 'PART_SALE'
 * Server-only code
 */

import { prisma } from '@/lib/prisma'
import { QuoteService } from '@/lib/quotes/service'
import { CreatePartSaleInput, UpdatePartSaleInput } from './schemas'

export class PartSaleService {
  /**
   * Create a part sale quote
   */
  static async createPartSale(data: CreatePartSaleInput, userId: string) {
    // Create quote directly with quoteType = PART_SALE
    const { prisma } = await import('@/lib/prisma')
    
    // Generate quote number
    const allQuotes = await prisma.quote.findMany({
      where: { quoteType: 'PART_SALE' },
      select: { quoteNumber: true },
    })

    const numbers = allQuotes.map((q) => {
      const num = parseInt(q.quoteNumber.replace('PS', ''))
      return isNaN(num) ? 0 : num
    })

    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 1000
    const quoteNumber = `PS${maxNumber + 1}`

    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        title: data.title || `Part Sale ${quoteNumber}`,
        description: data.description || null,
        customerId: data.customerId || null,
        bomId: data.bomId || null,
        estimatedHours: data.estimatedHours || null,
        hourlyRate: data.hourlyRate || null,
        quoteType: 'PART_SALE',
        status: 'DRAFT',
      },
      include: {
        customer: true,
        linkedBOMs: true,
      },
    })

    // Calculate margin/markup if provided
    if (data.margin !== undefined || data.markup !== undefined) {
      // Margin and markup calculations can be added here
      // For now, we'll store them in metadata
    }

    return quote
  }

  /**
   * Update a part sale quote
   */
  static async updatePartSale(id: string, data: UpdatePartSaleInput, userId: string) {
    // Verify it's a part sale
    const { prisma } = await import('@/lib/prisma')
    const existing = await prisma.quote.findUnique({
      where: { id },
    })

    if (!existing) {
      throw new Error('Part sale not found')
    }

    if (existing.quoteType !== 'PART_SALE') {
      throw new Error('Quote is not a part sale')
    }

    // Update using QuoteService but ensure quoteType stays PART_SALE
    const quoteData = {
      ...data,
      quoteType: 'PART_SALE' as const,
    }

    const quote = await QuoteService.updateQuote(id, quoteData, userId)

    return quote
  }

  /**
   * Get part sales (quotes with quoteType = 'PART_SALE')
   */
  static async getPartSales(filters?: {
    status?: string
    customerId?: string
    search?: string
    startDate?: Date
    endDate?: Date
  }) {
    const where: any = {
      quoteType: 'PART_SALE',
    }

    if (filters?.status) {
      where.status = filters.status
    }

    if (filters?.customerId) {
      where.customerId = filters.customerId
    }

    if (filters?.search) {
      where.OR = [
        { quoteNumber: { contains: filters.search, mode: 'insensitive' } },
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { customer: { name: { contains: filters.search, mode: 'insensitive' } } },
      ]
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {}
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate
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
              include: {
                part: {
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
          },
        },
        fileRecords: {
          orderBy: { createdAt: 'desc' },
        },
        revisions: {
          orderBy: { revisionNumber: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            fileRecords: true,
            revisions: true,
          },
        },
      },
      orderBy: { quoteNumber: 'desc' },
    })
  }

  /**
   * Convert part sale to job (if installation required)
   */
  static async convertToJob(partSaleId: string, userId: string, data?: {
    assignedToId?: string
    startDate?: string
    endDate?: string
  }) {
    // Use JobService to convert quote to job
    const { JobService } = await import('@/lib/jobs/service')

    const job = await JobService.convertQuoteToJob(
      {
        quoteId: partSaleId,
        assignedToId: data?.assignedToId,
        startDate: data?.startDate,
        endDate: data?.endDate,
      },
      userId
    )

    return job
  }
}

