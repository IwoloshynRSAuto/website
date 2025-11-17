/**
 * Billing module schemas
 * Zod validation schemas for billing milestones
 */

import { z } from 'zod'

export const billingStatuses = ['PENDING', 'INVOICED', 'PAID', 'CANCELLED'] as const

export const createBillingMilestoneSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
  milestoneId: z.string().optional().nullable(),
  amount: z.number().min(0, 'Amount must be positive'),
  percentage: z.number().min(0).max(100, 'Percentage must be between 0 and 100'),
  invoiceNumber: z.string().optional().nullable(),
  status: z.enum(billingStatuses).default('PENDING'),
  dueDate: z.string().transform((val) => val ? new Date(val) : null).optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const updateBillingMilestoneSchema = z.object({
  invoiceNumber: z.string().optional().nullable(),
  amount: z.number().min(0).optional(),
  percentage: z.number().min(0).max(100).optional(),
  status: z.enum(billingStatuses).optional(),
  invoicedAt: z.string().transform((val) => val ? new Date(val) : null).optional().nullable(),
  paidAt: z.string().transform((val) => val ? new Date(val) : null).optional().nullable(),
  dueDate: z.string().transform((val) => val ? new Date(val) : null).optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const billingFilterSchema = z.object({
  jobId: z.string().optional(),
  status: z.enum(billingStatuses).optional(),
  milestoneId: z.string().optional(),
})

export type CreateBillingMilestoneInput = z.infer<typeof createBillingMilestoneSchema>
export type UpdateBillingMilestoneInput = z.infer<typeof updateBillingMilestoneSchema>
export type BillingFilter = z.infer<typeof billingFilterSchema>


