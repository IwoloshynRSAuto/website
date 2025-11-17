/**
 * Zod schemas for customer validation
 */

import { z } from 'zod'

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  fileLink: z.string().optional().or(z.literal(''))
})

export const updateCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  email: z.union([
    z.string().email('Invalid email format'),
    z.literal(''),
    z.null()
  ]).optional(),
  phone: z.union([z.string(), z.literal(''), z.null()]).optional(),
  address: z.union([z.string(), z.literal(''), z.null()]).optional(),
  isActive: z.boolean().optional(),
  fileLink: z.union([z.string(), z.literal(''), z.null()]).optional(),
})

export const customerFilterSchema = z.object({
  activeOnly: z.boolean().optional(),
  search: z.string().optional(),
})

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>
export type CustomerFilter = z.infer<typeof customerFilterSchema>

