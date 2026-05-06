/**
 * Timesheet service layer - business logic for timesheet submissions
 * Server-only code
 */

import { prisma } from '@/lib/prisma'
import { recomputeTimeEntryCostSnapshot } from '@/lib/timekeeping/recompute-time-entry-cost-snapshot'

export class TimesheetService {
  /**
   * Approve a timesheet submission
   */
  static async approveSubmission(submissionId: string, approverId: string) {
    const updated = await prisma.$transaction(async (tx) => {
      const submission = await tx.timesheetSubmission.findUnique({
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
            select: {
              id: true,
              regularHours: true,
              overtimeHours: true,
              laborCodeId: true,
              rate: true,
            },
          },
        },
      })

      if (!submission) {
        throw new Error('Timesheet submission not found')
      }

      // Recompute/persist costing snapshots on approval so totals always include regular + OT hours
      // even for legacy entries that were created before snapshots existed.
      for (const entry of submission.timeEntries) {
        await recomputeTimeEntryCostSnapshot(tx, {
          timeEntryId: entry.id,
          regularHours: entry.regularHours,
          overtimeHours: entry.overtimeHours,
          laborCodeId: entry.laborCodeId,
          explicitRate: entry.rate != null ? Number(entry.rate) : null,
        })
      }

      return await tx.timesheetSubmission.update({
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
    })

    return updated
  }

  /**
   * Reject a timesheet submission
   */
  static async rejectSubmission(
    submissionId: string,
    approverId: string,
    rejectionReason: string | null | undefined
  ) {
    const submission = await prisma.timesheetSubmission.findUnique({
      where: { id: submissionId },
    })

    if (!submission) {
      throw new Error('Timesheet submission not found')
    }

    const reason =
      rejectionReason && rejectionReason.trim().length > 0 ? rejectionReason.trim() : null

    const updated = await prisma.timesheetSubmission.update({
      where: { id: submissionId },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectedById: approverId,
        rejectionReason: reason,
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

