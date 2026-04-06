/**
 * Zod schemas for timekeeping validation
 */

import { z } from 'zod'

export const createTimeOffRequestSchema = z.object({
  userId: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  requestType: z.enum(['VACATION', 'SICK', 'PERSONAL', 'UNPAID', 'OTHER']),
  reason: z.string().optional().nullable(),
  hours: z.number().positive().optional().nullable(),
})

export const updateTimeOffRequestSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
  rejectionReason: z.string().optional().nullable(),
  approvedById: z.string().optional().nullable(),
})

export const createExpenseReportSchema = z.object({
  userId: z.string().min(1),
  reportDate: z.string().datetime(),
  description: z.string().min(1),
  amount: z.number().positive(),
  category: z.enum(['TRAVEL', 'MEALS', 'SUPPLIES', 'EQUIPMENT', 'OTHER']),
  jobId: z.string().optional().nullable(),
  receiptFile: z.string().optional().nullable(), // FileRecord ID after upload
})

export const updateExpenseReportSchema = z.object({
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID']).optional(),
  rejectionReason: z.string().optional().nullable(),
  approvedById: z.string().optional().nullable(),
  paidAt: z.string().datetime().optional().nullable(),
})

export const createServiceReportSchema = z.object({
  jobId: z.string().min(1),
  userId: z.string().min(1),
  reportDate: z.string().datetime(),
  serviceType: z.enum(['INSTALLATION', 'MAINTENANCE', 'REPAIR', 'COMMISSIONING', 'TRAINING', 'OTHER']),
  description: z.string().min(1),
  hoursWorked: z.number().positive().optional().nullable(),
  customerNotes: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
  attachments: z.array(z.string()).optional(), // FileRecord IDs
})

export const updateServiceReportSchema = z.object({
  description: z.string().min(1).optional(),
  serviceType: z.enum(['INSTALLATION', 'MAINTENANCE', 'REPAIR', 'COMMISSIONING', 'TRAINING', 'OTHER']).optional(),
  hoursWorked: z.number().positive().optional().nullable(),
  customerNotes: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
  attachments: z.array(z.string()).optional(),
})

export const timeOffRequestFilterSchema = z.object({
  userId: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
  requestType: z.enum(['VACATION', 'SICK', 'PERSONAL', 'UNPAID', 'OTHER']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

export const expenseReportFilterSchema = z.object({
  userId: z.string().optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID']).optional(),
  category: z.enum(['TRAVEL', 'MEALS', 'SUPPLIES', 'EQUIPMENT', 'OTHER']).optional(),
  jobId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

export type CreateTimeOffRequestInput = z.infer<typeof createTimeOffRequestSchema>
export type UpdateTimeOffRequestInput = z.infer<typeof updateTimeOffRequestSchema>
export type CreateExpenseReportInput = z.infer<typeof createExpenseReportSchema>
export type UpdateExpenseReportInput = z.infer<typeof updateExpenseReportSchema>
export type CreateServiceReportInput = z.infer<typeof createServiceReportSchema>
export type UpdateServiceReportInput = z.infer<typeof updateServiceReportSchema>
export type TimeOffRequestFilter = z.infer<typeof timeOffRequestFilterSchema>
export type ExpenseReportFilter = z.infer<typeof expenseReportFilterSchema>

