/**
 * Jobs service layer - business logic for jobs
 * Server-only code
 */

import { prisma } from '@/lib/prisma'
import { getStorage } from '@/lib/storage'
import {
  CreateJobInput,
  UpdateJobInput,
  ConvertQuoteToJobInput,
  JobFilter,
  CreateJobMilestoneInput,
  UpdateJobMilestoneInput,
} from './schemas'

export class JobService {
  /**
   * Generate a unique job number
   */
  static async generateJobNumber(type: 'QUOTE' | 'JOB' = 'JOB'): Promise<string> {
    const prefix = type === 'QUOTE' ? 'Q' : 'E'

    // Find all jobs with the same prefix
    const allJobs = await prisma.job.findMany({
      where: {
        jobNumber: {
          startsWith: prefix,
        },
      },
      select: {
        jobNumber: true,
      },
    })

    // Extract numbers and find the highest
    const numbers = allJobs.map((job) => {
      const num = parseInt(job.jobNumber.substring(1))
      return isNaN(num) ? 0 : num
    })

    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 1000
    return `${prefix}${maxNumber + 1}`
  }

  /**
   * Create a new job
   */
  static async createJob(data: CreateJobInput, userId: string) {
    // Generate job number if not provided
    let jobNumber = data.jobNumber?.trim() || ''
    if (!jobNumber) {
      jobNumber = await this.generateJobNumber(data.type || 'JOB')
    }

    // Check if job number already exists
    const existingJob = await prisma.job.findUnique({
      where: { jobNumber },
    })

    if (existingJob) {
      throw new Error('Job number already exists')
    }

    // Create the job
    const job = await prisma.job.create({
      data: {
        jobNumber,
        title: data.title,
        description: data.description || null,
        type: data.type || 'JOB',
        status: data.status || (data.type === 'QUOTE' ? 'QUOTE' : 'ACTIVE'),
        priority: data.priority || 'MEDIUM',
        estimatedHours: data.estimatedHours || null,
        customerId: data.customerId || null,
        quoteId: data.quoteId || null,
        estimatedCost: data.estimatedCost || null,
        assignedToId: data.assignedToId || null,
        workCode: data.workCode || null,
        dueTodayPercent: data.dueTodayPercent || null,
        startDate: data.type === 'JOB' ? (data.startDate ? new Date(data.startDate) : new Date()) : data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        createdById: userId,
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
        quote: {
          select: {
            id: true,
            quoteNumber: true,
            title: true,
          },
        },
      },
    })

    return job
  }

  /**
   * Convert a quote to a job
   */
  static async convertQuoteToJob(data: ConvertQuoteToJobInput, userId: string) {
    // Get the quote with all related data
    const quote = await prisma.quote.findUnique({
      where: { id: data.quoteId },
      include: {
        customer: true,
        linkedBOMs: {
          include: {
            parts: true,
          },
        },
        fileRecords: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!quote) {
      throw new Error('Quote not found')
    }

    if (quote.status !== 'WON' && quote.status !== 'SENT') {
      throw new Error('Quote must be WON or SENT before conversion')
    }

    // Check if job already exists for this quote
    const existingJob = await prisma.job.findUnique({
      where: { quoteId: data.quoteId },
    })

    if (existingJob) {
      throw new Error('Job already exists for this quote')
    }

    // Generate job number
    const jobNumber = await this.generateJobNumber('JOB')

    // Calculate estimated hours from quote
    const estimatedHours = quote.estimatedHours || null

    // Create the job
    const job = await prisma.job.create({
      data: {
        jobNumber,
        title: quote.title,
        description: quote.description || `Job converted from quote ${quote.quoteNumber}`,
        type: 'JOB',
        status: 'ACTIVE',
        priority: 'MEDIUM',
        estimatedHours,
        estimatedCost: quote.amount,
        customerId: quote.customerId,
        quoteId: quote.id,
        assignedToId: data.assignedToId || null,
        workCode: data.workCode || null,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        endDate: data.endDate ? new Date(data.endDate) : null,
        convertedAt: new Date(),
        createdById: userId,
      },
      include: {
        customer: true,
        quote: true,
        assignedTo: true,
        createdBy: true,
      },
    })

    // Copy BOM parts to job (if needed, create job-specific BOM)
    // This would require a JobBOM model or similar - for now, we'll link the quote's BOM

    // Copy file records (create new FileRecord entries pointing to same files)
    for (const fileRecord of quote.fileRecords) {
      await prisma.fileRecord.create({
        data: {
          storagePath: fileRecord.storagePath,
          fileUrl: fileRecord.fileUrl,
          fileName: fileRecord.fileName,
          fileType: fileRecord.fileType,
          fileSize: fileRecord.fileSize,
          metadata: {
            ...(fileRecord.metadata as object || {}),
            copiedFromQuote: true,
            originalFileRecordId: fileRecord.id,
          },
          createdById: userId,
          linkedJobId: job.id,
          linkedQuoteId: null, // Don't link to quote, this is job's copy
        },
      })
    }

    // Update quote status to indicate conversion
    await prisma.quote.update({
      where: { id: quote.id },
      data: {
        status: 'WON', // Ensure it's marked as won
      },
    })

    return job
  }

  /**
   * Update a job
   */
  static async updateJob(id: string, data: UpdateJobInput, userId: string) {
    const existingJob = await prisma.job.findUnique({
      where: { id },
    })

    if (!existingJob) {
      throw new Error('Job not found')
    }

    const updateData: any = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.status !== undefined) updateData.status = data.status
    if (data.priority !== undefined) updateData.priority = data.priority
    if (data.estimatedHours !== undefined) updateData.estimatedHours = data.estimatedHours
    if (data.actualHours !== undefined) updateData.actualHours = data.actualHours
    if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId
    if (data.customerId !== undefined) updateData.customerId = data.customerId
    if (data.workCode !== undefined) updateData.workCode = data.workCode
    if (data.estimatedCost !== undefined) updateData.estimatedCost = data.estimatedCost
    if (data.dueTodayPercent !== undefined) updateData.dueTodayPercent = data.dueTodayPercent
    if (data.inQuickBooks !== undefined) updateData.inQuickBooks = data.inQuickBooks
    if (data.inLDrive !== undefined) updateData.inLDrive = data.inLDrive
    if (data.startDate !== undefined) {
      updateData.startDate = data.startDate ? new Date(data.startDate) : null
    }
    if (data.endDate !== undefined) {
      updateData.endDate = data.endDate ? new Date(data.endDate) : null
    }
    if (data.lastFollowUp !== undefined) {
      updateData.lastFollowUp = data.lastFollowUp ? new Date(data.lastFollowUp) : null
    }

    const job = await prisma.job.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        quote: true,
        assignedTo: true,
        createdBy: true,
        milestones: {
          orderBy: { scheduledStartDate: 'asc' },
        },
        timeEntries: {
          include: {
            laborCode: true,
            user: true,
          },
        },
        quotedLabor: {
          include: {
            laborCode: true,
          },
        },
        fileRecords: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    return job
  }

  /**
   * Get jobs with filters
   */
  static async getJobs(filters: JobFilter = {}) {
    const where: any = {}

    if (filters.status) {
      where.status = filters.status
    }

    if (filters.type) {
      where.type = filters.type
    }

    if (filters.assignedToId) {
      where.assignedToId = filters.assignedToId
    }

    if (filters.customerId) {
      where.customerId = filters.customerId
    }

    if (filters.priority) {
      where.priority = filters.priority
    }

    if (filters.search) {
      where.OR = [
        { jobNumber: { contains: filters.search, mode: 'insensitive' } },
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
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

    return await prisma.job.findMany({
      where,
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        quote: {
          select: {
            id: true,
            quoteNumber: true,
            title: true,
            status: true,
          },
        },
        milestones: {
          orderBy: { scheduledStartDate: 'asc' },
        },
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
        _count: {
          select: {
            timeEntries: true,
            milestones: true,
            fileRecords: true,
          },
        },
      },
      orderBy: { jobNumber: 'desc' },
    })
  }

  /**
   * Calculate job costs and hours
   */
  static async calculateJobCosts(jobId: string) {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        timeEntries: {
          include: {
            laborCode: true,
            user: true,
          },
        },
        quotedLabor: {
          include: {
            laborCode: true,
          },
        },
      },
    })

    if (!job) {
      throw new Error('Job not found')
    }

    // Calculate actual hours
    const actualHours = job.timeEntries.reduce((sum, entry) => {
      return sum + (entry.regularHours || 0) + (entry.overtimeHours || 0)
    }, 0)

    // Calculate estimated hours
    const estimatedHours = job.quotedLabor.reduce((sum, labor) => {
      return sum + (labor.estimatedHours || 0)
    }, 0) || job.estimatedHours || 0

    // Calculate labor cost
    const laborCost = job.timeEntries.reduce((sum, entry) => {
      const rate = entry.rate ? Number(entry.rate) : 0
      const hours = (entry.regularHours || 0) + (entry.overtimeHours || 0)
      return sum + rate * hours
    }, 0)

    // Calculate estimated labor cost
    const estimatedLaborCost = job.quotedLabor.reduce((sum, labor) => {
      const rate = labor.laborCode.hourlyRate ? Number(labor.laborCode.hourlyRate) : 0
      return sum + rate * (labor.estimatedHours || 0)
    }, 0)

    // Update job with calculated values
    await prisma.job.update({
      where: { id: jobId },
      data: {
        actualHours,
      },
    })

    return {
      estimatedHours,
      actualHours,
      hoursVariance: actualHours - estimatedHours,
      hoursVariancePercent: estimatedHours > 0 ? ((actualHours - estimatedHours) / estimatedHours) * 100 : 0,
      estimatedLaborCost,
      laborCost,
      laborCostVariance: laborCost - estimatedLaborCost,
      laborCostVariancePercent: estimatedLaborCost > 0 ? ((laborCost - estimatedLaborCost) / estimatedLaborCost) * 100 : 0,
    }
  }

  /**
   * Create a job milestone
   */
  static async createMilestone(data: CreateJobMilestoneInput, userId: string) {
    const milestone = await prisma.jobMilestone.create({
      data: {
        jobId: data.jobId,
        name: data.name,
        description: data.description || null,
        milestoneType: data.milestoneType,
        scheduledStartDate: data.scheduledStartDate ? new Date(data.scheduledStartDate) : null,
        scheduledEndDate: data.scheduledEndDate ? new Date(data.scheduledEndDate) : null,
        status: data.status || 'NOT_STARTED',
        billingPercentage: data.billingPercentage || null,
        isBillingTrigger: data.isBillingTrigger || false,
      },
      include: {
        job: {
          select: {
            id: true,
            jobNumber: true,
            title: true,
          },
        },
      },
    })

    return milestone
  }

  /**
   * Update a job milestone
   */
  static async updateMilestone(milestoneId: string, data: UpdateJobMilestoneInput) {
    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.scheduledStartDate !== undefined) {
      updateData.scheduledStartDate = data.scheduledStartDate ? new Date(data.scheduledStartDate) : null
    }
    if (data.scheduledEndDate !== undefined) {
      updateData.scheduledEndDate = data.scheduledEndDate ? new Date(data.scheduledEndDate) : null
    }
    if (data.actualStartDate !== undefined) {
      updateData.actualStartDate = data.actualStartDate ? new Date(data.actualStartDate) : null
    }
    if (data.actualEndDate !== undefined) {
      updateData.actualEndDate = data.actualEndDate ? new Date(data.actualEndDate) : null
    }
    if (data.status !== undefined) updateData.status = data.status
    if (data.billingPercentage !== undefined) updateData.billingPercentage = data.billingPercentage
    if (data.isBillingTrigger !== undefined) updateData.isBillingTrigger = data.isBillingTrigger

    const milestone = await prisma.jobMilestone.update({
      where: { id: milestoneId },
      data: updateData,
      include: {
        job: {
          select: {
            id: true,
            jobNumber: true,
            title: true,
          },
        },
      },
    })

    return milestone
  }
}

