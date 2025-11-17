/**
 * Zod schemas for quote validation
 */

import { z } from 'zod'

export const createQuoteSchema = z.object({
  bomId: z.string().min(1, 'BOM ID is required'),
  customerId: z.string().optional().nullable(),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  estimatedHours: z.number().positive().optional(),
  hourlyRate: z.number().positive().optional(),
  paymentTerms: z.string().optional().nullable(),
  validUntil: z.string().datetime().optional().nullable(),
})

export const updateQuoteSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'SENT', 'WON', 'LOST']).optional(),
  amount: z.number().nonnegative().optional(),
  lastFollowUp: z.string().datetime().optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
  validUntil: z.string().datetime().optional().nullable(),
  estimatedHours: z.number().positive().optional(),
  hourlyRate: z.number().positive().optional(),
  laborCost: z.number().nonnegative().optional(),
  materialCost: z.number().nonnegative().optional(),
  overheadCost: z.number().nonnegative().optional(),
  profitMargin: z.number().nonnegative().optional(),
})

export const quoteStatusSchema = z.enum(['DRAFT', 'SENT', 'WON', 'LOST'])

export const quoteFilterSchema = z.object({
  status: quoteStatusSchema.optional(),
  customerId: z.string().optional(),
  search: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>
export type QuoteStatus = z.infer<typeof quoteStatusSchema>
export type QuoteFilter = z.infer<typeof quoteFilterSchema>

