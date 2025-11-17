/**
 * Vendors service layer - business logic for vendors
 * Server-only code
 */

import { prisma } from '@/lib/prisma'
import {
  CreateVendorInput,
  UpdateVendorInput,
  CreateVendorPartPriceInput,
  VendorFilter,
  VendorPartPriceFilter,
} from './schemas'

export class VendorService {
  /**
   * Create a vendor
   */
  static async createVendor(data: CreateVendorInput) {
    // Check if vendor with same name already exists
    const existing = await prisma.vendor.findUnique({
      where: { name: data.name },
    })

    if (existing) {
      throw new Error('Vendor with this name already exists')
    }

    const vendor = await prisma.vendor.create({
      data: {
        name: data.name,
        contactName: data.contactName || null,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        website: data.website || null,
        category: data.category || null,
        notes: data.notes || null,
        isActive: data.isActive ?? true,
      },
    })

    return vendor
  }

  /**
   * Update a vendor
   */
  static async updateVendor(id: string, data: UpdateVendorInput) {
    const existing = await prisma.vendor.findUnique({
      where: { id },
    })

    if (!existing) {
      throw new Error('Vendor not found')
    }

    // Check name uniqueness if name is being updated
    if (data.name && data.name !== existing.name) {
      const nameExists = await prisma.vendor.findUnique({
        where: { name: data.name },
      })
      if (nameExists) {
        throw new Error('Vendor with this name already exists')
      }
    }

    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.contactName !== undefined) updateData.contactName = data.contactName
    if (data.email !== undefined) updateData.email = data.email
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.address !== undefined) updateData.address = data.address
    if (data.website !== undefined) updateData.website = data.website
    if (data.category !== undefined) updateData.category = data.category
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.isActive !== undefined) updateData.isActive = data.isActive

    const vendor = await prisma.vendor.update({
      where: { id },
      data: updateData,
    })

    return vendor
  }

  /**
   * Get vendors with filters
   */
  static async getVendors(filters: VendorFilter = {}) {
    const where: any = {}

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { contactName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    if (filters.category) {
      where.category = filters.category
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive
    }

    return await prisma.vendor.findMany({
      where,
      include: {
        _count: {
          select: {
            partPrices: true,
            purchaseOrders: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })
  }

  /**
   * Get vendor by ID
   */
  static async getVendorById(id: string) {
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        partPrices: {
          include: {
            part: {
              select: {
                id: true,
                partNumber: true,
                manufacturer: true,
                description: true,
              },
            },
          },
          orderBy: { effectiveDate: 'desc' },
        },
        purchaseOrders: {
          orderBy: { orderDate: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            partPrices: true,
            purchaseOrders: true,
          },
        },
      },
    })

    if (!vendor) {
      throw new Error('Vendor not found')
    }

    return vendor
  }

  /**
   * Create vendor part price
   */
  static async createVendorPartPrice(data: CreateVendorPartPriceInput) {
    // Check if vendor and part exist
    const vendor = await prisma.vendor.findUnique({
      where: { id: data.vendorId },
    })
    if (!vendor) {
      throw new Error('Vendor not found')
    }

    const part = await prisma.part.findUnique({
      where: { id: data.partId },
    })
    if (!part) {
      throw new Error('Part not found')
    }

    const price = await prisma.vendorPartPrice.create({
      data: {
        vendorId: data.vendorId,
        partId: data.partId,
        price: data.price,
        leadTimeDays: data.leadTimeDays || null,
        effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : new Date(),
        minimumOrderQuantity: data.minimumOrderQuantity || null,
        notes: data.notes || null,
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
        part: {
          select: {
            id: true,
            partNumber: true,
            manufacturer: true,
            description: true,
          },
        },
      },
    })

    return price
  }

  /**
   * Get vendor part prices with filters
   */
  static async getVendorPartPrices(filters: VendorPartPriceFilter = {}) {
    const where: any = {}

    if (filters.vendorId) {
      where.vendorId = filters.vendorId
    }

    if (filters.partId) {
      where.partId = filters.partId
    }

    if (filters.effectiveDate) {
      where.effectiveDate = { gte: new Date(filters.effectiveDate) }
    }

    return await prisma.vendorPartPrice.findMany({
      where,
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
        part: {
          select: {
            id: true,
            partNumber: true,
            manufacturer: true,
            description: true,
          },
        },
      },
      orderBy: { effectiveDate: 'desc' },
    })
  }

  /**
   * Get vendor dashboard metrics
   */
  static async getVendorMetrics(vendorId: string, year?: number) {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    })

    if (!vendor) {
      throw new Error('Vendor not found')
    }

    const yearFilter = year || new Date().getFullYear()
    const startDate = new Date(yearFilter, 0, 1)
    const endDate = new Date(yearFilter, 11, 31, 23, 59, 59, 999)

    // Get purchase orders for the year
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: {
        vendorId,
        orderDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        items: true,
      },
    })

    // Calculate metrics
    const totalSpend = purchaseOrders.reduce((sum, po) => {
      return sum + (po.totalAmount || po.items.reduce((itemSum, item) => itemSum + item.totalPrice, 0))
    }, 0)

    const totalOrders = purchaseOrders.length
    const totalPartsOrdered = purchaseOrders.reduce((sum, po) => {
      return sum + po.items.reduce((itemSum, item) => itemSum + item.quantity, 0)
    }, 0)

    const uniqueParts = new Set(
      purchaseOrders.flatMap((po) => po.items.filter((item) => item.partId).map((item) => item.partId!))
    ).size

    return {
      vendor: {
        id: vendor.id,
        name: vendor.name,
      },
      year: yearFilter,
      totalSpend,
      totalOrders,
      totalPartsOrdered,
      uniqueParts,
      averageOrderValue: totalOrders > 0 ? totalSpend / totalOrders : 0,
    }
  }
}

