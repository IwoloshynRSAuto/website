import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/parts/vendor-insights
 * Get vendor spend tracking and insights
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString(), 10)

    // Get vendor spend by year from purchase orders
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: {
        status: { in: ['RECEIVED', 'PARTIALLY_RECEIVED', 'COMPLETED'] },
        orderDate: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
      include: {
        vendor: true,
        items: {
          include: {
            part: true,
          },
        },
      },
    })

    // Calculate spend per vendor for current year
    const currentYearSpend: Record<string, { vendor: any; total: number; partsCount: number }> = {}
    const lastYear = year - 1

    purchaseOrders.forEach((po) => {
      const vendorId = po.vendorId
      if (!currentYearSpend[vendorId]) {
        currentYearSpend[vendorId] = {
          vendor: po.vendor,
          total: 0,
          partsCount: 0,
        }
      }
      po.items.forEach((item) => {
        currentYearSpend[vendorId].total += Number(item.totalPrice) || 0
        currentYearSpend[vendorId].partsCount += item.quantity
      })
    })

    // Get last year's spend for comparison
    const lastYearPOs = await prisma.purchaseOrder.findMany({
      where: {
        status: { in: ['RECEIVED', 'PARTIALLY_RECEIVED', 'COMPLETED'] },
        orderDate: {
          gte: new Date(`${lastYear}-01-01`),
          lt: new Date(`${year}-01-01`),
        },
      },
      include: {
        vendor: true,
        items: true,
      },
    })

    const lastYearSpend: Record<string, number> = {}
    lastYearPOs.forEach((po) => {
      const vendorId = po.vendorId
      if (!lastYearSpend[vendorId]) {
        lastYearSpend[vendorId] = 0
      }
      po.items.forEach((item) => {
        lastYearSpend[vendorId] += Number(item.totalPrice) || 0
      })
    })

    // Get all vendors referenced as sources in parts (primarySource or secondarySources)
    const allParts = await prisma.part.findMany({
      select: {
        primarySource: true,
        secondarySources: true,
      },
    })

    // Collect all unique vendor names from parts
    const vendorNamesFromParts = new Set<string>()
    allParts.forEach((part) => {
      if (part.primarySource) {
        vendorNamesFromParts.add(part.primarySource)
      }
      if (part.secondarySources) {
        try {
          const secondary = JSON.parse(part.secondarySources)
          if (Array.isArray(secondary)) {
            secondary.forEach((v: string) => {
              if (v) vendorNamesFromParts.add(v)
            })
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    })

    // Get vendor records for all vendor names found in parts
    const vendorsFromParts = await prisma.vendor.findMany({
      where: {
        name: {
          in: Array.from(vendorNamesFromParts),
        },
      },
    })

    // Create a map of vendor name to vendor object
    const vendorMap = new Map<string, any>()
    vendorsFromParts.forEach((v) => {
      vendorMap.set(v.name, v)
    })

    // Also include vendors from purchase orders
    Object.values(currentYearSpend).forEach((data) => {
      vendorMap.set(data.vendor.name, data.vendor)
    })

    // Create a set of vendor IDs that are referenced as sources in parts
    const sourceVendorIds = new Set<string>()
    vendorsFromParts.forEach((v) => {
      sourceVendorIds.add(v.id)
    })

    // Format response - include all vendors (from parts and purchase orders)
    const vendorInsightsMap = new Map<string, any>()

    // Add vendors from purchase orders (with spend data)
    Object.values(currentYearSpend).forEach((data) => {
      vendorInsightsMap.set(data.vendor.id, {
        vendorId: data.vendor.id,
        vendorName: data.vendor.name,
        totalSpendThisYear: data.total,
        totalSpendLastYear: lastYearSpend[data.vendor.id] || 0,
        totalPartsOrdered: data.partsCount,
        vendorContact: {
          name: data.vendor.contactName,
          email: data.vendor.email,
          phone: data.vendor.phone,
          website: data.vendor.website,
        },
        isSource: sourceVendorIds.has(data.vendor.id), // Vendor is referenced as a source in parts
      })
    })

    // Add vendors from parts that aren't in purchase orders
    vendorsFromParts.forEach((vendor) => {
      if (!vendorInsightsMap.has(vendor.id)) {
        vendorInsightsMap.set(vendor.id, {
          vendorId: vendor.id,
          vendorName: vendor.name,
          totalSpendThisYear: 0,
          totalSpendLastYear: 0,
          totalPartsOrdered: 0,
          vendorContact: {
            name: vendor.contactName,
            email: vendor.email,
            phone: vendor.phone,
            website: vendor.website,
          },
          isSource: true, // Vendor is referenced as a source in parts
        })
      } else {
        // Mark existing vendor as source
        const existing = vendorInsightsMap.get(vendor.id)
        existing.isSource = true
      }
    })

    // Convert to array and sort by total spend descending, then by name
    const vendorInsights = Array.from(vendorInsightsMap.values()).sort((a, b) => {
      if (b.totalSpendThisYear !== a.totalSpendThisYear) {
        return b.totalSpendThisYear - a.totalSpendThisYear
      }
      return a.vendorName.localeCompare(b.vendorName)
    })

    return NextResponse.json({
      success: true,
      data: {
        year,
        vendors: vendorInsights,
        totalSpend: vendorInsights.reduce((sum, v) => sum + v.totalSpendThisYear, 0),
      },
    })
  } catch (error: any) {
    console.error('Error fetching vendor insights:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch vendor insights',
      },
      { status: 500 }
    )
  }
}

