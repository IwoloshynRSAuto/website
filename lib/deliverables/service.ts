/**
 * Deliverables service layer - business logic for job deliverables
 * Server-only code
 */

import { prisma } from '@/lib/prisma'
import { CreateDeliverableInput, UpdateDeliverableInput, DeliverableFilter } from './schemas'

export class DeliverableService {
  /**
   * Create a new deliverable
   */
  static async createDeliverable(data: CreateDeliverableInput, userId: string) {
    const deliverable = await prisma.jobDeliverable.create({
      data: {
        jobId: data.jobId,
        templateCode: data.templateCode || null,
        name: data.name,
        description: data.description || null,
        deliverableType: data.deliverableType || 'DOCUMENT',
        status: data.status || 'PENDING',
        assignedToId: data.assignedToId || null,
        dueDate: data.dueDate || null,
        notes: data.notes || null,
      },
      include: {
        job: {
          select: {
            id: true,
            jobNumber: true,
            title: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        files: {
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

    return deliverable
  }

  /**
   * Update a deliverable
   */
  static async updateDeliverable(id: string, data: UpdateDeliverableInput) {
    const updateData: any = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.deliverableType !== undefined) updateData.deliverableType = data.deliverableType
    if (data.status !== undefined) {
      updateData.status = data.status
      // Auto-set dates based on status transitions
      if (data.status === 'COMPLETED' && !data.completedDate) {
        updateData.completedDate = new Date()
      }
      if (data.status === 'DELIVERED' && !data.deliveredDate) {
        updateData.deliveredDate = new Date()
      }
      if (data.status === 'ACCEPTED' && !data.acceptedDate) {
        updateData.acceptedDate = new Date()
      }
    }
    if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate
    if (data.completedDate !== undefined) updateData.completedDate = data.completedDate
    if (data.deliveredDate !== undefined) updateData.deliveredDate = data.deliveredDate
    if (data.acceptedDate !== undefined) updateData.acceptedDate = data.acceptedDate
    if (data.notes !== undefined) updateData.notes = data.notes

    const deliverable = await prisma.jobDeliverable.update({
      where: { id },
      data: updateData,
      include: {
        job: {
          select: {
            id: true,
            jobNumber: true,
            title: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        files: {
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

    return deliverable
  }

  /**
   * Get deliverables with filters
   */
  static async getDeliverables(filters: DeliverableFilter = {}) {
    const where: any = {}

    if (filters.jobId) {
      where.jobId = filters.jobId
    }

    if (filters.status) {
      where.status = filters.status
    }

    if (filters.assignedToId) {
      where.assignedToId = filters.assignedToId
    }

    if (filters.templateCode) {
      where.templateCode = filters.templateCode
    }

    if (filters.deliverableType) {
      where.deliverableType = filters.deliverableType
    }

    return await prisma.jobDeliverable.findMany({
      where,
      include: {
        job: {
          select: {
            id: true,
            jobNumber: true,
            title: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        files: {
          select: {
            id: true,
            fileName: true,
            fileType: true,
            fileSize: true,
            createdAt: true,
          },
        },
      },
      orderBy: [
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
    })
  }

  /**
   * Get a single deliverable by ID
   */
  static async getDeliverableById(id: string) {
    return await prisma.jobDeliverable.findUnique({
      where: { id },
      include: {
        job: {
          select: {
            id: true,
            jobNumber: true,
            title: true,
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        files: {
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
   * Delete a deliverable
   */
  static async deleteDeliverable(id: string) {
    await prisma.jobDeliverable.delete({
      where: { id },
    })

    return { success: true }
  }

  /**
   * Get deliverable templates (RSA PM010-PM140)
   */
  static getDeliverableTemplates() {
    return [
      { code: 'PM010', name: 'PM010 - Project Management Plan', type: 'DOCUMENT' },
      { code: 'PM020', name: 'PM020 - System Requirements Specification', type: 'DOCUMENT' },
      { code: 'PM030', name: 'PM030 - Design Documentation', type: 'DOCUMENT' },
      { code: 'PM040', name: 'PM040 - Test Plan', type: 'DOCUMENT' },
      { code: 'PM050', name: 'PM050 - Installation Manual', type: 'DOCUMENT' },
      { code: 'PM060', name: 'PM060 - Operation Manual', type: 'DOCUMENT' },
      { code: 'PM070', name: 'PM070 - Maintenance Manual', type: 'DOCUMENT' },
      { code: 'PM080', name: 'PM080 - Training Materials', type: 'DOCUMENT' },
      { code: 'PM090', name: 'PM090 - As-Built Drawings', type: 'DOCUMENT' },
      { code: 'PM100', name: 'PM100 - Software Deliverables', type: 'SOFTWARE' },
      { code: 'PM110', name: 'PM110 - Hardware Components', type: 'HARDWARE' },
      { code: 'PM120', name: 'PM120 - Calibration Certificates', type: 'DOCUMENT' },
      { code: 'PM130', name: 'PM130 - FAT/SAT Reports', type: 'DOCUMENT' },
      { code: 'PM140', name: 'PM140 - Commissioning Report', type: 'DOCUMENT' },
    ]
  }
}


