/**
 * Zod schemas for vendors validation
 */

import { z } from 'zod'

export const createVendorSchema = z.object({
  name: z.string().min(1),
  contactName: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  website: z.string().url().optional().nullable(),
  category: z.enum(['ELECTRONICS', 'MECHANICAL', 'SOFTWARE', 'SUPPLIES', 'SERVICES', 'OTHER']).optional(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
})

export const updateVendorSchema = z.object({
  name: z.string().min(1).optional(),
  contactName: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  website: z.string().url().optional().nullable(),
  category: z.enum(['ELECTRONICS', 'MECHANICAL', 'SOFTWARE', 'SUPPLIES', 'SERVICES', 'OTHER']).optional(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

export const createVendorPartPriceSchema = z.object({
  vendorId: z.string().min(1),
  partId: z.string().min(1),
  price: z.number().positive(),
  leadTimeDays: z.number().int().min(0).optional().nullable(),
  effectiveDate: z.string().datetime().optional(),
  minimumOrderQuantity: z.number().int().min(1).optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const vendorFilterSchema = z.object({
  search: z.string().optional(),
  category: z.enum(['ELECTRONICS', 'MECHANICAL', 'SOFTWARE', 'SUPPLIES', 'SERVICES', 'OTHER']).optional(),
  isActive: z.boolean().optional(),
})

export const vendorPartPriceFilterSchema = z.object({
  vendorId: z.string().optional(),
  partId: z.string().optional(),
  effectiveDate: z.string().datetime().optional(),
})

export type CreateVendorInput = z.infer<typeof createVendorSchema>
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>
export type CreateVendorPartPriceInput = z.infer<typeof createVendorPartPriceSchema>
export type VendorFilter = z.infer<typeof vendorFilterSchema>
export type VendorPartPriceFilter = z.infer<typeof vendorPartPriceFilterSchema>

