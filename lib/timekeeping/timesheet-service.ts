/**
 * Timesheet service layer - business logic for timesheet submissions
 * Server-only code
 */

import { prisma } from '@/lib/prisma'

export class TimesheetService {
  /**
   * Approve a timesheet submission
   */
  static async approveSubmission(submissionId: string, approverId: string) {
    const submission = await prisma.timesheetSubmission.findUnique({
      where: { id: submissionId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        timeEntries: {
          include: {
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
                hourlyRate: true,
              },
            },
          },
        },
      },
    })

    if (!submission) {
      throw new Error('Timesheet submission not found')
    }

    const updated = await prisma.timesheetSubmission.update({
      where: { id: submissionId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedById: approverId,
        rejectedAt: null,
        rejectedById: null,
        rejectionReason: null,
      },
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
        timeEntries: {
          include: {
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
                hourlyRate: true,
              },
            },
          },
        },
      },
    })

    return updated
  }

  /**
   * Reject a timesheet submission
   */
  static async rejectSubmission(
    submissionId: string,
    approverId: string,
    rejectionReason: string
  ) {
    const submission = await prisma.timesheetSubmission.findUnique({
      where: { id: submissionId },
    })

    if (!submission) {
      throw new Error('Timesheet submission not found')
    }

    if (!rejectionReason || rejectionReason.trim().length === 0) {
      throw new Error('Rejection reason is required')
    }

    const updated = await prisma.timesheetSubmission.update({
      where: { id: submissionId },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectedById: approverId,
        rejectionReason: rejectionReason.trim(),
        approvedAt: null,
        approvedById: null,
      },
      include: {
        user: {
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
        timeEntries: {
          include: {
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
                hourlyRate: true,
              },
            },
          },
        },
      },
    })

    return updated
  }

  /**
   * Reopen a timesheet submission (change status back to DRAFT)
   */
  static async reopenSubmission(submissionId: string) {
    const submission = await prisma.timesheetSubmission.findUnique({
      where: { id: submissionId },
    })

    if (!submission) {
      throw new Error('Timesheet submission not found')
    }

    const updated = await prisma.timesheetSubmission.update({
      where: { id: submissionId },
      data: {
        status: 'DRAFT',
        approvedAt: null,
        approvedById: null,
        rejectedAt: null,
        rejectedById: null,
        rejectionReason: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        timeEntries: {
          include: {
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
                hourlyRate: true,
              },
            },
          },
        },
      },
    })

    return updated
  }

  /**
   * Get pending timesheet submissions for approval
   */
  static async getPendingSubmissions(approverId?: string) {
    return await prisma.timesheetSubmission.findMany({
      where: {
        status: 'SUBMITTED',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        timeEntries: {
          include: {
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
                hourlyRate: true,
              },
            },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    })
  }
}

