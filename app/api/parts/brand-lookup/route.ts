import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/parts/brand-lookup
 * Search parts by part number, name, or brand (manufacturer)
 * Returns vendors who sell that brand with contact info
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const brand = searchParams.get('brand') || ''

    if (!search && !brand) {
      return NextResponse.json(
        { success: false, error: 'Search term or brand is required' },
        { status: 400 }
      )
    }

    let parts: any[] = []

    if (brand) {
      // Search by brand (manufacturer)
      parts = await prisma.part.findMany({
        where: {
          manufacturer: { contains: brand },
        },
        include: {
          vendorPrices: {
            include: {
              vendor: {
                select: {
                  id: true,
                  name: true,
                  contactName: true,
                  email: true,
                  phone: true,
                  website: true,
                },
              },
            },
            orderBy: { price: 'asc' }, // Lowest price first
          },
        },
        take: 100,
      })
    } else {
      // Search by part number or name
      parts = await prisma.part.findMany({
        where: {
          OR: [
            { partNumber: { contains: search } },
            { description: { contains: search } },
            { manufacturer: { contains: search } },
          ],
        },
        include: {
          vendorPrices: {
            include: {
              vendor: {
                select: {
                  id: true,
                  name: true,
                  contactName: true,
                  email: true,
                  phone: true,
                  website: true,
                },
              },
            },
            orderBy: { price: 'asc' },
          },
        },
        take: 100,
      })
    }

    // Group vendors by brand
    const brandVendors: Record<string, {
      brand: string
      vendors: Array<{
        vendor: any
        lowestPrice: number | null
        partCount: number
      }>
    }> = {}

    parts.forEach((part) => {
      const brandName = part.manufacturer
      if (!brandVendors[brandName]) {
        brandVendors[brandName] = {
          brand: brandName,
          vendors: [],
        }
      }

      // Get unique vendors for this part
      const vendorMap = new Map<string, { vendor: any; price: number }>()
      part.vendorPrices.forEach((vp) => {
        const vendorId = vp.vendor.id
        if (!vendorMap.has(vendorId) || vendorMap.get(vendorId)!.price > vp.price) {
          vendorMap.set(vendorId, {
            vendor: vp.vendor,
            price: vp.price,
          })
        }
      })

      // Add vendors to brand
      vendorMap.forEach((data) => {
        const existingVendor = brandVendors[brandName].vendors.find(
          (v) => v.vendor.id === data.vendor.id
        )
        if (existingVendor) {
          existingVendor.partCount++
          if (data.price < (existingVendor.lowestPrice || Infinity)) {
            existingVendor.lowestPrice = data.price
          }
        } else {
          brandVendors[brandName].vendors.push({
            vendor: data.vendor,
            lowestPrice: data.price,
            partCount: 1,
          })
        }
      })
    })

    // Format response
    const results = Object.values(brandVendors).map((bv) => ({
      brand: bv.brand,
      vendors: bv.vendors.map((v) => ({
        vendor: v.vendor,
        contactInfo: {
          name: v.vendor.contactName,
          email: v.vendor.email,
          phone: v.vendor.phone,
          website: v.vendor.website,
        },
        lowestPrice: v.lowestPrice,
        partsAvailable: v.partCount,
      })),
    }))

    return NextResponse.json({
      success: true,
      data: {
        search,
        brand,
        results,
      },
    })
  } catch (error: any) {
    console.error('Error in brand lookup:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to perform brand lookup',
      },
      { status: 500 }
    )
  }
}

