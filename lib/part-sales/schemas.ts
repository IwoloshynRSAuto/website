/**
 * Zod schemas for part sales validation
 * Part sales are quotes with quoteType = 'PART_SALE'
 */

import { z } from 'zod'
import { createQuoteSchema, updateQuoteSchema } from '@/lib/quotes/schemas'

export const createPartSaleSchema = createQuoteSchema.extend({
  quoteType: z.literal('PART_SALE').default('PART_SALE'),
  margin: z.number().optional().nullable(),
  markup: z.number().optional().nullable(),
})

export const updatePartSaleSchema = updateQuoteSchema.extend({
  margin: z.number().optional().nullable(),
  markup: z.number().optional().nullable(),
})

export type CreatePartSaleInput = z.infer<typeof createPartSaleSchema>
export type UpdatePartSaleInput = z.infer<typeof updatePartSaleSchema>

