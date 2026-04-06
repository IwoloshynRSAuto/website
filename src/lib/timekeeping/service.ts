/**
 * Timekeeping service layer - business logic for timekeeping, PTO, expenses
 * Server-only code
 */

import { prisma } from '@/lib/prisma'
import {
  CreateTimeOffRequestInput,
  UpdateTimeOffRequestInput,
  CreateExpenseReportInput,
  UpdateExpenseReportInput,
  CreateServiceReportInput,
  UpdateServiceReportInput,
  TimeOffRequestFilter,
  ExpenseReportFilter,
} from './schemas'

export class TimekeepingService {
  /**
   * Create a time-off request
   */
  static async createTimeOffRequest(data: CreateTimeOffRequestInput, userId: string) {
    // Validate user can only create requests for themselves (unless admin)
    if (data.userId !== userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (user?.role !== 'ADMIN') {
        throw new Error('Unauthorized to create time-off request for another user')
      }
    }

    // Calculate hours if not provided
    let hours = data.hours
    if (!hours) {
      const startDate = new Date(data.startDate)
      const endDate = new Date(data.endDate)
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      // Assume 8 hours per day
      hours = diffDays * 8
    }

    const request = await prisma.timeOffRequest.create({
      data: {
        userId: data.userId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        requestType: data.requestType,
        reason: data.reason || null,
        hours: hours || null,
        status: 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return request
  }

  /**
   * Update time-off request status
   */
  static async updateTimeOffRequest(
    requestId: string,
    data: UpdateTimeOffRequestInput,
    approverId: string
  ) {
    const request = await prisma.timeOffRequest.findUnique({
      where: { id: requestId },
    })

    if (!request) {
      throw new Error('Time-off request not found')
    }

    const updateData: any = {}

    if (data.status === 'APPROVED') {
      updateData.status = 'APPROVED'
      updateData.approvedAt = new Date()
      updateData.approvedById = approverId
      updateData.rejectedAt = null
      updateData.rejectedById = null
      updateData.rejectionReason = null
    } else if (data.status === 'REJECTED') {
      updateData.status = 'REJECTED'
      updateData.rejectedAt = new Date()
      updateData.rejectedById = approverId
      updateData.rejectionReason = data.rejectionReason || null
      updateData.approvedAt = null
      updateData.approvedById = null
    } else if (data.status === 'CANCELLED') {
      updateData.status = 'CANCELLED'
    }

    const updated = await prisma.timeOffRequest.update({
      where: { id: requestId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        rejectedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return updated
  }

  /**
   * Get time-off requests with filters
   */
  static async getTimeOffRequests(filters: TimeOffRequestFilter = {}) {
    const where: any = {}

    if (filters.userId) {
      where.userId = filters.userId
    }

    if (filters.status) {
      where.status = filters.status
    }

    if (filters.requestType) {
      where.requestType = filters.requestType
    }

    if (filters.startDate || filters.endDate) {
      where.OR = []
      if (filters.startDate && filters.endDate) {
        where.OR.push({
          startDate: { lte: new Date(filters.endDate) },
          endDate: { gte: new Date(filters.startDate) },
        })
      }
    }

    return await prisma.timeOffRequest.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        rejectedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
    })
  }

  /**
   * Create an expense report
   */
  static async createExpenseReport(data: CreateExpenseReportInput, userId: string) {
    // Validate user can only create reports for themselves (unless admin)
    if (data.userId !== userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (user?.role !== 'ADMIN') {
        throw new Error('Unauthorized to create expense report for another user')
      }
    }

    const report = await prisma.expenseReport.create({
      data: {
        userId: data.userId,
        reportDate: new Date(data.reportDate),
        description: data.description,
        amount: data.amount,
        category: data.category,
        jobId: data.jobId || null,
        receiptFileId: data.receiptFile || null,
        status: 'DRAFT',
      },
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
        receiptFile: {
          select: {
            id: true,
            fileName: true,
            fileType: true,
            storagePath: true,
          },
        },
      },
    })

    return report
  }


  /**
   * Update expense report status
   */
  static async updateExpenseReport(
    reportId: string,
    data: UpdateExpenseReportInput,
    approverId: string
  ) {
    const report = await prisma.expenseReport.findUnique({
      where: { id: reportId },
    })

    if (!report) {
      throw new Error('Expense report not found')
    }

    const updateData: any = {}

    if (data.status === 'SUBMITTED') {
      updateData.status = 'SUBMITTED'
      updateData.submittedAt = new Date()
    } else if (data.status === 'APPROVED') {
      updateData.status = 'APPROVED'
      updateData.approvedAt = new Date()
      updateData.approvedById = approverId
      updateData.rejectedAt = null
      updateData.rejectedById = null
      updateData.rejectionReason = null
    } else if (data.status === 'REJECTED') {
      updateData.status = 'REJECTED'
      updateData.rejectedAt = new Date()
      updateData.rejectedById = approverId
      updateData.rejectionReason = data.rejectionReason || null
      updateData.approvedAt = null
      updateData.approvedById = null
    } else if (data.status === 'PAID') {
      updateData.status = 'PAID'
      updateData.paidAt = data.paidAt ? new Date(data.paidAt) : new Date()
    }

    const updated = await prisma.expenseReport.update({
      where: { id: reportId },
      data: updateData,
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
        receiptFile: {
          select: {
            id: true,
            fileName: true,
            fileType: true,
            storagePath: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        rejectedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return updated
  }

  /**
   * Get expense reports with filters
   */
  static async getExpenseReports(filters: ExpenseReportFilter = {}) {
    const where: any = {}

    if (filters.userId) {
      where.userId = filters.userId
    }

    if (filters.status) {
      where.status = filters.status
    }

    if (filters.category) {
      where.category = filters.category
    }

    if (filters.jobId) {
      where.jobId = filters.jobId
    }

    if (filters.startDate || filters.endDate) {
      where.reportDate = {}
      if (filters.startDate) {
        where.reportDate.gte = new Date(filters.startDate)
      }
      if (filters.endDate) {
        where.reportDate.lte = new Date(filters.endDate)
      }
    }

    return await prisma.expenseReport.findMany({
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
        receiptFile: {
          select: {
            id: true,
            fileName: true,
            fileType: true,
            storagePath: true,
          },
        },
      },
      orderBy: { reportDate: 'desc' },
    })
  }

  /**
   * Create a service report
   */
  static async createServiceReport(data: CreateServiceReportInput, userId: string) {
    const report = await prisma.serviceReport.create({
      data: {
        jobId: data.jobId,
        userId: data.userId,
        reportDate: new Date(data.reportDate),
        serviceType: data.serviceType,
        description: data.description,
        hoursWorked: data.hoursWorked || null,
        customerNotes: data.customerNotes || null,
        internalNotes: data.internalNotes || null,
        attachments: data.attachments
          ? {
              connect: data.attachments.map((id) => ({ id })),
            }
          : undefined,
      },
      include: {
        job: {
          select: {
            id: true,
            jobNumber: true,
            title: true,
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        attachments: {
          select: {
            id: true,
            fileName: true,
            fileType: true,
            storagePath: true,
          },
        },
      },
    })

    return report
  }

  /**
   * Update a service report
   */
  static async updateServiceReport(reportId: string, data: UpdateServiceReportInput) {
    const updateData: any = {}
    if (data.description !== undefined) updateData.description = data.description
    if (data.serviceType !== undefined) updateData.serviceType = data.serviceType
    if (data.hoursWorked !== undefined) updateData.hoursWorked = data.hoursWorked
    if (data.customerNotes !== undefined) updateData.customerNotes = data.customerNotes
    if (data.internalNotes !== undefined) updateData.internalNotes = data.internalNotes
    if (data.attachments !== undefined) {
      updateData.attachments = {
        set: data.attachments.map((id) => ({ id })),
      }
    }

    const report = await prisma.serviceReport.update({
      where: { id: reportId },
      data: updateData,
      include: {
        job: {
          select: {
            id: true,
            jobNumber: true,
            title: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        attachments: {
          select: {
            id: true,
            fileName: true,
            fileType: true,
            storagePath: true,
          },
        },
      },
    })

    return report
  }

  /**
   * Get service reports for a job
   */
  static async getServiceReports(jobId: string) {
    return await prisma.serviceReport.findMany({
      where: { jobId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        attachments: {
          select: {
            id: true,
            fileName: true,
            fileType: true,
            storagePath: true,
            createdAt: true,
          },
        },
      },
      orderBy: { reportDate: 'desc' },
    })
  }
}

