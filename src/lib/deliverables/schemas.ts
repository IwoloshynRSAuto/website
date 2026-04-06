/**
 * Deliverables module schemas
 * Zod validation schemas for job deliverables
 */

import { z } from 'zod'

export const deliverableTemplateCodes = [
  'PM010', 'PM020', 'PM030', 'PM040', 'PM050', 'PM060', 'PM070', 'PM080',
  'PM090', 'PM100', 'PM110', 'PM120', 'PM130', 'PM140'
] as const

export const deliverableTypes = ['DOCUMENT', 'HARDWARE', 'SOFTWARE', 'OTHER'] as const
export const deliverableStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELIVERED', 'ACCEPTED', 'REJECTED'] as const

export const createDeliverableSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
  templateCode: z.enum(deliverableTemplateCodes).optional().nullable(),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().nullable(),
  deliverableType: z.enum(deliverableTypes).default('DOCUMENT'),
  status: z.enum(deliverableStatuses).default('PENDING'),
  assignedToId: z.string().optional().nullable(),
  dueDate: z.string().transform((val) => val ? new Date(val) : null).optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const updateDeliverableSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  deliverableType: z.enum(deliverableTypes).optional(),
  status: z.enum(deliverableStatuses).optional(),
  assignedToId: z.string().optional().nullable(),
  dueDate: z.string().transform((val) => val ? new Date(val) : null).optional().nullable(),
  completedDate: z.string().transform((val) => val ? new Date(val) : null).optional().nullable(),
  deliveredDate: z.string().transform((val) => val ? new Date(val) : null).optional().nullable(),
  acceptedDate: z.string().transform((val) => val ? new Date(val) : null).optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const deliverableFilterSchema = z.object({
  jobId: z.string().optional(),
  status: z.enum(deliverableStatuses).optional(),
  assignedToId: z.string().optional(),
  templateCode: z.enum(deliverableTemplateCodes).optional(),
  deliverableType: z.enum(deliverableTypes).optional(),
})

export type CreateDeliverableInput = z.infer<typeof createDeliverableSchema>
export type UpdateDeliverableInput = z.infer<typeof updateDeliverableSchema>
export type DeliverableFilter = z.infer<typeof deliverableFilterSchema>


