/**
 * Zod schemas for analytics and metrics validation
 */

import { z } from 'zod'

export const analyticsFilterSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  userId: z.string().optional(),
  jobId: z.string().optional(),
  customerId: z.string().optional(),
  year: z.number().int().min(2000).max(2100).optional(),
  month: z.number().int().min(1).max(12).optional(),
})

export type AnalyticsFilter = z.infer<typeof analyticsFilterSchema>

