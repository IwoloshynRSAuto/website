/**
 * Equipment service layer - business logic for equipment management
 * Server-only code
 */

import { prisma } from '@/lib/prisma'
import { getStorage } from '@/lib/storage'
import { CreateEquipmentInput, UpdateEquipmentInput, CreateMaintenanceLogInput, CreateCalibrationInput, EquipmentFilter } from './schemas'

export class EquipmentService {
  /**
   * Create new equipment
   */
  static async createEquipment(data: CreateEquipmentInput, userId: string) {
    const equipment = await prisma.equipment.create({
      data: {
        name: data.name,
        type: data.type,
        serial: data.serial || null,
        purchaseDate: data.purchaseDate || null,
        serviceStatus: data.serviceStatus || 'OPERATIONAL',
        pmSchedule: data.pmSchedule || null,
        lastPMService: data.lastPMService || null,
        nextPMService: data.nextPMService || null,
        assignedArea: data.assignedArea || null,
        notes: data.notes || null,
      },
      include: {
        maintenanceLogs: {
          take: 5,
          orderBy: { serviceDate: 'desc' },
        },
        calibrationHistory: {
          take: 5,
          orderBy: { calibrationDate: 'desc' },
        },
        manuals: {
          select: {
            id: true,
            fileName: true,
            fileType: true,
            fileSize: true,
            createdAt: true,
          },
        },
      },
    })

    return equipment
  }

  /**
   * Update equipment
   */
  static async updateEquipment(id: string, data: UpdateEquipmentInput) {
    const updateData: any = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.type !== undefined) updateData.type = data.type
    if (data.serial !== undefined) updateData.serial = data.serial
    if (data.purchaseDate !== undefined) updateData.purchaseDate = data.purchaseDate
    if (data.serviceStatus !== undefined) updateData.serviceStatus = data.serviceStatus
    if (data.pmSchedule !== undefined) updateData.pmSchedule = data.pmSchedule
    if (data.lastPMService !== undefined) updateData.lastPMService = data.lastPMService
    if (data.nextPMService !== undefined) updateData.nextPMService = data.nextPMService
    if (data.assignedArea !== undefined) updateData.assignedArea = data.assignedArea
    if (data.notes !== undefined) updateData.notes = data.notes

    const equipment = await prisma.equipment.update({
      where: { id },
      data: updateData,
      include: {
        maintenanceLogs: {
          take: 10,
          orderBy: { serviceDate: 'desc' },
        },
        calibrationHistory: {
          take: 10,
          orderBy: { calibrationDate: 'desc' },
        },
        manuals: {
          select: {
            id: true,
            fileName: true,
            fileType: true,
            fileSize: true,
            createdAt: true,
          },
        },
      },
    })

    return equipment
  }

  /**
   * Get equipment with filters
   */
  static async getEquipment(filters: EquipmentFilter = {}) {
    const where: any = {}

    if (filters.type) {
      where.type = filters.type
    }

    if (filters.serviceStatus) {
      where.serviceStatus = filters.serviceStatus
    }

    if (filters.assignedArea) {
      where.assignedArea = filters.assignedArea
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { serial: { contains: filters.search, mode: 'insensitive' } },
        { notes: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    return await prisma.equipment.findMany({
      where,
      include: {
        maintenanceLogs: {
          take: 5,
          orderBy: { serviceDate: 'desc' },
        },
        calibrationHistory: {
          take: 5,
          orderBy: { calibrationDate: 'desc' },
        },
        manuals: {
          take: 5,
          select: {
            id: true,
            fileName: true,
            fileType: true,
            createdAt: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })
  }

  /**
   * Get a single equipment by ID
   */
  static async getEquipmentById(id: string) {
    return await prisma.equipment.findUnique({
      where: { id },
      include: {
        maintenanceLogs: {
          orderBy: { serviceDate: 'desc' },
        },
        calibrationHistory: {
          orderBy: { calibrationDate: 'desc' },
        },
        manuals: {
          select: {
            id: true,
            fileName: true,
            fileType: true,
            fileSize: true,
            storagePath: true,
            fileUrl: true,
            createdAt: true,
          },
        },
      },
    })
  }

  /**
   * Delete equipment
   */
  static async deleteEquipment(id: string) {
    await prisma.equipment.delete({
      where: { id },
    })

    return { success: true }
  }

  /**
   * Create maintenance log
   */
  static async createMaintenanceLog(data: CreateMaintenanceLogInput) {
    const log = await prisma.equipmentMaintenanceLog.create({
      data: {
        equipmentId: data.equipmentId,
        serviceDate: data.serviceDate,
        serviceType: data.serviceType,
        description: data.description,
        performedBy: data.performedBy || null,
        cost: data.cost || null,
        notes: data.notes || null,
      },
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    })

    // Update equipment's lastPMService if this is a preventive maintenance
    if (data.serviceType === 'PREVENTIVE') {
      await prisma.equipment.update({
        where: { id: data.equipmentId },
        data: {
          lastPMService: data.serviceDate,
        },
      })
    }

    return log
  }

  /**
   * Create calibration record
   */
  static async createCalibration(data: CreateCalibrationInput, certificateFileId?: string) {
    const calibration = await prisma.equipmentCalibration.create({
      data: {
        equipmentId: data.equipmentId,
        calibrationDate: data.calibrationDate,
        nextCalibrationDate: data.nextCalibrationDate || null,
        calibratedBy: data.calibratedBy || null,
        certificateNumber: data.certificateNumber || null,
        notes: data.notes || null,
        certificateFileId: certificateFileId || null,
      },
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        certificateFile: {
          select: {
            id: true,
            fileName: true,
            fileType: true,
            fileUrl: true,
          },
        },
      },
    })

    return calibration
  }

  /**
   * Upload manual for equipment
   */
  static async uploadManual(
    equipmentId: string,
    file: File,
    userId: string
  ): Promise<{ fileRecordId: string; storagePath: string }> {
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
    })

    if (!equipment) {
      throw new Error('Equipment not found')
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
    ]

    if (!allowedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} not allowed. Allowed types: ${allowedTypes.join(', ')}`)
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      throw new Error(`File size exceeds maximum of ${maxSize / 1024 / 1024}MB`)
    }

    // Generate storage path
    const timestamp = Date.now()
    const sanitizedName = equipment.name.replace(/[^a-zA-Z0-9]/g, '_')
    const fileExtension = file.name.split('.').pop()
    const storagePath = `equipment/${sanitizedName}_${timestamp}.${fileExtension}`

    // Upload to storage
    const storage = await getStorage()
    const buffer = Buffer.from(await file.arrayBuffer())
    await storage.upload(storagePath, buffer, {
      contentType: file.type,
    })

    // Create FileRecord
    const fileRecord = await prisma.fileRecord.create({
      data: {
        storagePath,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        createdById: userId,
        linkedEquipmentId: equipmentId,
        metadata: {
          equipmentId,
          equipmentName: equipment.name,
        },
      },
    })

    return {
      fileRecordId: fileRecord.id,
      storagePath,
    }
  }
}


