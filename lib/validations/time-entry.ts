import { z } from 'zod'

export const createTimeEntrySchema = z.object({
  date: z.string().transform((val) => new Date(val)),
  regularHours: z.number().min(0, 'Regular hours must be positive').default(0),
  overtimeHours: z.number().min(0, 'Overtime hours must be positive').default(0),
  notes: z.string().optional(),
  billable: z.boolean().default(true),
  rate: z.number().optional(),
  userId: z.string().min(1, 'User is required'),
  jobId: z.string().min(1, 'Job is required'),
  laborCodeId: z.string().optional()
})

export const updateTimeEntrySchema = createTimeEntrySchema.partial().extend({
  id: z.string().min(1, 'Time entry ID is required')
})

