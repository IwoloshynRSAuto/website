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

/** Create a quote without a BOM (pipeline / manual entry). */
export const createQuoteSimpleSchema = z.object({
  quoteNumber: z.string().optional().nullable(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  amount: z.number().nonnegative().optional().default(0),
  /** ISO datetime or `yyyy-MM-dd` from a date input */
  validUntil: z.string().optional().nullable(),
})

/** Matches Prisma QuoteStatus */
export const quoteStatusEnumSchema = z.enum([
  'DRAFT',
  'SENT',
  'APPROVED',
  'CANCELLED',
  'WON',
  'LOST',
])

export const updateQuoteSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  status: quoteStatusEnumSchema.optional(),
  amount: z.number().nonnegative().optional(),
  lastFollowUp: z.string().datetime().optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
  /** ISO datetime or yyyy-MM-dd */
  validUntil: z.string().optional().nullable(),
  estimatedHours: z.number().nonnegative().nullable().optional(),
  hourlyRate: z.number().nonnegative().nullable().optional(),
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
export type CreateQuoteSimpleInput = z.infer<typeof createQuoteSimpleSchema>
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>
export type QuoteStatus = z.infer<typeof quoteStatusSchema>
export type QuoteFilter = z.infer<typeof quoteFilterSchema>

