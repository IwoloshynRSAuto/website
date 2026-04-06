import { prisma } from '@/lib/prisma'
import { validateWeekBoundaries } from '@/lib/utils/date-validation'

export type WeeklyApprovalSubmissionType = 'TIME' | 'ATTENDANCE'

export type WeeklyApprovalSubmissionStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'

export interface WeeklyApprovalsEmployeeRow {
  id: string
  name: string | null
  email: string
  role: string
  isActive: boolean
}

export interface WeeklyApproalsSubmissionDTO {
  id: string
  userId: string
  type: WeeklyApprovalSubmissionType
  status: WeeklyApprovalSubmissionStatus
  weekStart: string
  weekEnd: string
  submittedAt: string | null
  approvedAt: string | null
  approvedById: string | null
  rejectedAt: string | null
  rejectedById: string | null
  rejectionReason: string | null
}

export interface WeeklyApprovalsResponse {
  weekStart: string
  weekEnd: string
  employees: WeeklyApprovalsEmployeeRow[]
  submissions: WeeklyApproalsSubmissionDTO[]
}

export async function getWeeklyApprovals(params: {
  weekStart: Date
  weekEnd: Date
  includeInactive: boolean
}): Promise<WeeklyApprovalsResponse> {
  const { weekStart, weekEnd, includeInactive } = params

  const employees = await prisma.user.findMany({
    where: includeInactive ? {} : { isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
    },
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }, { email: 'asc' }],
  })

  const submissions = await prisma.timesheetSubmission.findMany({
    where: {
      weekStart,
      weekEnd,
      userId: { in: employees.map((e) => e.id) },
      type: { in: ['TIME', 'ATTENDANCE'] },
    },
    select: {
      id: true,
      userId: true,
      type: true,
      status: true,
      weekStart: true,
      weekEnd: true,
      submittedAt: true,
      approvedAt: true,
      approvedById: true,
      rejectedAt: true,
      rejectedById: true,
      rejectionReason: true,
    },
    orderBy: [{ userId: 'asc' }, { type: 'asc' }],
  })

  return {
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    employees,
    submissions: submissions.map((s) => ({
      ...s,
      type: s.type as WeeklyApprovalSubmissionType,
      status: s.status as WeeklyApprovalSubmissionStatus,
      weekStart: s.weekStart.toISOString(),
      weekEnd: s.weekEnd.toISOString(),
      submittedAt: s.submittedAt ? s.submittedAt.toISOString() : null,
      approvedAt: s.approvedAt ? s.approvedAt.toISOString() : null,
      rejectedAt: s.rejectedAt ? s.rejectedAt.toISOString() : null,
    })),
  }
}

export function parseAndNormalizeWeekStart(weekStartRaw: string): { weekStart: Date; weekEnd: Date } {
  const parsed = new Date(weekStartRaw)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid weekStart')
  }
  const normalized = validateWeekBoundaries(parsed, parsed)
  return { weekStart: normalized.weekStart, weekEnd: normalized.weekEnd }
}

