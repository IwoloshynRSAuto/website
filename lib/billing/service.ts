/**
 * Billing service layer - business logic for billing milestones
 * Server-only code
 */

import { prisma } from '@/lib/prisma'
import { CreateBillingMilestoneInput, UpdateBillingMilestoneInput, BillingFilter } from './schemas'

export class BillingService {
  /**
   * Create a billing milestone
   */
  static async createBillingMilestone(data: CreateBillingMilestoneInput, userId: string) {
    // Verify job exists
    const job = await prisma.job.findUnique({
      where: { id: data.jobId },
      select: {
        id: true,
        jobNumber: true,
        estimatedCost: true,
      },
    })

    if (!job) {
      throw new Error('Job not found')
    }

    // If milestoneId is provided, verify it exists and belongs to the job
    if (data.milestoneId) {
      const milestone = await prisma.jobMilestone.findFirst({
        where: {
          id: data.milestoneId,
          jobId: data.jobId,
        },
      })

      if (!milestone) {
        throw new Error('Milestone not found or does not belong to this job')
      }
    }

    const billingMilestone = await prisma.billingMilestone.create({
      data: {
        jobId: data.jobId,
        milestoneId: data.milestoneId || null,
        amount: data.amount,
        percentage: data.percentage,
        invoiceNumber: data.invoiceNumber || null,
        status: data.status || 'PENDING',
        dueDate: data.dueDate || null,
        notes: data.notes || null,
        createdById: userId,
      },
      include: {
        job: {
          select: {
            id: true,
            jobNumber: true,
            title: true,
            estimatedCost: true,
          },
        },
        milestone: {
          select: {
            id: true,
            name: true,
            milestoneType: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return billingMilestone
  }

  /**
   * Update a billing milestone
   */
  static async updateBillingMilestone(id: string, data: UpdateBillingMilestoneInput) {
    const updateData: any = {}

    if (data.invoiceNumber !== undefined) updateData.invoiceNumber = data.invoiceNumber
    if (data.amount !== undefined) updateData.amount = data.amount
    if (data.percentage !== undefined) updateData.percentage = data.percentage
    if (data.status !== undefined) {
      updateData.status = data.status
      // Auto-set dates based on status transitions
      if (data.status === 'INVOICED' && !data.invoicedAt) {
        updateData.invoicedAt = new Date()
      }
      if (data.status === 'PAID' && !data.paidAt) {
        updateData.paidAt = new Date()
      }
    }
    if (data.invoicedAt !== undefined) updateData.invoicedAt = data.invoicedAt
    if (data.paidAt !== undefined) updateData.paidAt = data.paidAt
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate
    if (data.notes !== undefined) updateData.notes = data.notes

    const billingMilestone = await prisma.billingMilestone.update({
      where: { id },
      data: updateData,
      include: {
        job: {
          select: {
            id: true,
            jobNumber: true,
            title: true,
            estimatedCost: true,
          },
        },
        milestone: {
          select: {
            id: true,
            name: true,
            milestoneType: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return billingMilestone
  }

  /**
   * Get billing milestones with filters
   */
  static async getBillingMilestones(filters: BillingFilter = {}) {
    const where: any = {}

    if (filters.jobId) {
      where.jobId = filters.jobId
    }

    if (filters.status) {
      where.status = filters.status
    }

    if (filters.milestoneId) {
      where.milestoneId = filters.milestoneId
    }

    return await prisma.billingMilestone.findMany({
      where,
      include: {
        job: {
          select: {
            id: true,
            jobNumber: true,
            title: true,
            estimatedCost: true,
          },
        },
        milestone: {
          select: {
            id: true,
            name: true,
            milestoneType: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { invoicedAt: 'desc' },
        { createdAt: 'desc' },
      ],
    })
  }

  /**
   * Get a single billing milestone by ID
   */
  static async getBillingMilestoneById(id: string) {
    return await prisma.billingMilestone.findUnique({
      where: { id },
      include: {
        job: {
          select: {
            id: true,
            jobNumber: true,
            title: true,
            estimatedCost: true,
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        milestone: {
          select: {
            id: true,
            name: true,
            milestoneType: true,
            status: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })
  }

  /**
   * Delete a billing milestone
   */
  static async deleteBillingMilestone(id: string) {
    await prisma.billingMilestone.delete({
      where: { id },
    })

    return { success: true }
  }

  /**
   * Automatically create billing milestone when a milestone with isBillingTrigger is completed
   * This should be called when a milestone status changes to COMPLETED
   */
  static async handleMilestoneCompletion(milestoneId: string, userId: string) {
    const milestone = await prisma.jobMilestone.findUnique({
      where: { id: milestoneId },
      include: {
        job: {
          select: {
            id: true,
            jobNumber: true,
            estimatedCost: true,
          },
        },
      },
    })

    if (!milestone) {
      throw new Error('Milestone not found')
    }

    // Only create billing milestone if isBillingTrigger is true and status is COMPLETED
    if (!milestone.isBillingTrigger || milestone.status !== 'COMPLETED') {
      return null
    }

    // Check if billing milestone already exists for this milestone
    const existing = await prisma.billingMilestone.findFirst({
      where: {
        milestoneId: milestoneId,
      },
    })

    if (existing) {
      // Update existing billing milestone
      return await this.updateBillingMilestone(existing.id, {
        status: 'PENDING',
      })
    }

    // Calculate amount based on percentage and job estimated cost
    const amount = milestone.billingPercentage && milestone.job.estimatedCost
      ? (milestone.billingPercentage / 100) * milestone.job.estimatedCost
      : 0

    // Create new billing milestone
    return await this.createBillingMilestone(
      {
        jobId: milestone.jobId,
        milestoneId: milestoneId,
        amount: amount,
        percentage: milestone.billingPercentage || 0,
        status: 'PENDING',
      },
      userId
    )
  }

  /**
   * Get billing summary for a job
   */
  static async getJobBillingSummary(jobId: string) {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        jobNumber: true,
        estimatedCost: true,
      },
    })

    if (!job) {
      throw new Error('Job not found')
    }

    const billingMilestones = await prisma.billingMilestone.findMany({
      where: { jobId },
      include: {
        milestone: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    const totalBilled = billingMilestones
      .filter(bm => bm.status === 'INVOICED' || bm.status === 'PAID')
      .reduce((sum, bm) => sum + bm.amount, 0)

    const totalPaid = billingMilestones
      .filter(bm => bm.status === 'PAID')
      .reduce((sum, bm) => sum + bm.amount, 0)

    const pendingAmount = billingMilestones
      .filter(bm => bm.status === 'PENDING')
      .reduce((sum, bm) => sum + bm.amount, 0)

    const totalPercentage = billingMilestones.reduce((sum, bm) => sum + bm.percentage, 0)

    return {
      job,
      totalBilled,
      totalPaid,
      pendingAmount,
      totalPercentage,
      billingMilestones,
      remainingAmount: (job.estimatedCost || 0) - totalBilled,
    }
  }
}


