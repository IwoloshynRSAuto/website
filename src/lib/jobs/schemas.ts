/**
 * Zod schemas for job validation
 */

import { z } from 'zod'

export const createJobSchema = z.object({
  type: z.enum(['QUOTE', 'JOB']).default('JOB'),
  jobNumber: z.string().optional().nullable(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  status: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  estimatedHours: z.number().positive().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  quoteId: z.string().optional().nullable(),
  workCode: z.string().optional().nullable(),
  estimatedCost: z.number().nonnegative().optional().nullable(),
  dueTodayPercent: z.number().min(0).max(100).optional().nullable(),
  fileLink: z.string().optional().nullable(),
})

export const updateJobSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  estimatedHours: z.number().nonnegative().optional().nullable(),
  actualHours: z.number().nonnegative().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  workCode: z.string().optional().nullable(),
  estimatedCost: z.number().nonnegative().optional().nullable(),
  dueTodayPercent: z.number().min(0).max(100).optional().nullable(),
  inQuickBooks: z.boolean().optional(),
  inLDrive: z.boolean().optional(),
  lastFollowUp: z.string().datetime().optional().nullable(),
  fileLink: z.string().optional().nullable(),
})

export const convertQuoteToJobSchema = z.object({
  quoteId: z.string().min(1, 'Quote ID is required'),
  assignedToId: z.string().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  workCode: z.string().optional().nullable(),
})

export const jobFilterSchema = z.object({
  status: z.string().optional(),
  type: z.enum(['QUOTE', 'JOB']).optional(),
  assignedToId: z.string().optional(),
  customerId: z.string().optional(),
  search: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

export const createJobMilestoneSchema = z.object({
  jobId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  milestoneType: z.enum(['ENGINEERING', 'PANEL_BUILD', 'FAT', 'SAT', 'COMMISSIONING', 'OTHER']),
  scheduledStartDate: z.string().datetime().optional().nullable(),
  scheduledEndDate: z.string().datetime().optional().nullable(),
  actualStartDate: z.string().datetime().optional().nullable(),
  actualEndDate: z.string().datetime().optional().nullable(),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED']).default('NOT_STARTED'),
  billingPercentage: z.number().min(0).max(100).optional().nullable(),
  isBillingTrigger: z.boolean().default(false),
})

export const updateJobMilestoneSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  scheduledStartDate: z.string().datetime().optional().nullable(),
  scheduledEndDate: z.string().datetime().optional().nullable(),
  actualStartDate: z.string().datetime().optional().nullable(),
  actualEndDate: z.string().datetime().optional().nullable(),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED']).optional(),
  billingPercentage: z.number().min(0).max(100).optional().nullable(),
  isBillingTrigger: z.boolean().optional(),
})

export type CreateJobInput = z.infer<typeof createJobSchema>
export type UpdateJobInput = z.infer<typeof updateJobSchema>
export type ConvertQuoteToJobInput = z.infer<typeof convertQuoteToJobSchema>
export type JobFilter = z.infer<typeof jobFilterSchema>
export type CreateJobMilestoneInput = z.infer<typeof createJobMilestoneSchema>
export type UpdateJobMilestoneInput = z.infer<typeof updateJobMilestoneSchema>

