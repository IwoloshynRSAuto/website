/**
 * Equipment module schemas
 * Zod validation schemas for equipment management
 */

import { z } from 'zod'

export const equipmentTypes = ['CNC', 'WELDER', 'MILL', 'LATHE', 'FORKLIFT', 'CALIBRATION_TOOL', 'OTHER'] as const
export const serviceStatuses = ['OPERATIONAL', 'MAINTENANCE', 'REPAIR', 'OUT_OF_SERVICE'] as const
export const maintenanceTypes = ['PREVENTIVE', 'REPAIR', 'INSPECTION', 'CALIBRATION'] as const

export const createEquipmentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(equipmentTypes),
  serial: z.string().optional().nullable(),
  purchaseDate: z.string().transform((val) => val ? new Date(val) : null).optional().nullable(),
  serviceStatus: z.enum(serviceStatuses).default('OPERATIONAL'),
  pmSchedule: z.string().optional().nullable(),
  lastPMService: z.string().transform((val) => val ? new Date(val) : null).optional().nullable(),
  nextPMService: z.string().transform((val) => val ? new Date(val) : null).optional().nullable(),
  assignedArea: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const updateEquipmentSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(equipmentTypes).optional(),
  serial: z.string().optional().nullable(),
  purchaseDate: z.string().transform((val) => val ? new Date(val) : null).optional().nullable(),
  serviceStatus: z.enum(serviceStatuses).optional(),
  pmSchedule: z.string().optional().nullable(),
  lastPMService: z.string().transform((val) => val ? new Date(val) : null).optional().nullable(),
  nextPMService: z.string().transform((val) => val ? new Date(val) : null).optional().nullable(),
  assignedArea: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const createMaintenanceLogSchema = z.object({
  equipmentId: z.string().min(1, 'Equipment ID is required'),
  serviceDate: z.string().transform((val) => new Date(val)),
  serviceType: z.enum(maintenanceTypes),
  description: z.string().min(1, 'Description is required'),
  performedBy: z.string().optional().nullable(),
  cost: z.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const createCalibrationSchema = z.object({
  equipmentId: z.string().min(1, 'Equipment ID is required'),
  calibrationDate: z.string().transform((val) => new Date(val)),
  nextCalibrationDate: z.string().transform((val) => val ? new Date(val) : null).optional().nullable(),
  calibratedBy: z.string().optional().nullable(),
  certificateNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const equipmentFilterSchema = z.object({
  type: z.enum(equipmentTypes).optional(),
  serviceStatus: z.enum(serviceStatuses).optional(),
  assignedArea: z.string().optional(),
  search: z.string().optional(),
})

export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>
export type UpdateEquipmentInput = z.infer<typeof updateEquipmentSchema>
export type CreateMaintenanceLogInput = z.infer<typeof createMaintenanceLogSchema>
export type CreateCalibrationInput = z.infer<typeof createCalibrationSchema>
export type EquipmentFilter = z.infer<typeof equipmentFilterSchema>


