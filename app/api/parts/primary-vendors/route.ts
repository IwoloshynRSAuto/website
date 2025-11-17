import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/parts/primary-vendors
 * Get all vendors that are used as primarySource in parts
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all unique primarySource values from parts
    let parts: Array<{ primarySource: string | null }> = []
    try {
      parts = await prisma.part.findMany({
        select: {
          primarySource: true,
        },
        where: {
          primarySource: {
            not: null,
          },
        },
      })
    } catch (error: any) {
      // Parts table might not exist or have issues
      console.warn('Error fetching parts for primary vendors:', error?.message)
      return NextResponse.json({
        success: true,
        data: [],
      })
    }

    // Extract unique vendor names (deduplicate)
    const vendorNamesSet = new Set<string>()
    parts.forEach((p) => {
      if (p.primarySource) {
        vendorNamesSet.add(p.primarySource)
      }
    })
    const vendorNames = Array.from(vendorNamesSet).sort()

    // Get vendor records for these names (if vendors table exists)
    let vendors: Array<{ id: string; name: string }> = []
    try {
      vendors = await prisma.vendor.findMany({
        where: {
          name: {
            in: vendorNames,
          },
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: 'asc',
        },
      })
    } catch (error: any) {
      // Vendors table doesn't exist, that's okay - we'll just use vendor names from parts
      console.warn('Vendors table not found, using vendor names from parts only:', error?.message)
    }

    // Also include any vendor names that don't have a vendor record yet
    // (in case someone typed a vendor name that doesn't exist in the vendors table)
    const vendorNamesInDb = new Set(vendors.map((v) => v.name))
    const missingVendors = vendorNames
      .filter((name) => !vendorNamesInDb.has(name))
      .map((name) => ({
        id: `temp-${name}`, // Temporary ID for vendors not in DB
        name,
      }))

    // Combine and return
    // If vendors table doesn't exist, all vendors will be "missing" vendors with temp IDs
    const allVendors = [...vendors, ...missingVendors].sort((a, b) =>
      a.name.localeCompare(b.name)
    )

    console.log(`[Primary Vendors API] Found ${vendorNames.length} unique vendor names from ${parts.length} parts`)
    console.log(`[Primary Vendors API] Returning ${allVendors.length} vendors (${vendors.length} from DB, ${missingVendors.length} temp)`)

    return NextResponse.json({
      success: true,
      data: allVendors,
    })
  } catch (error: any) {
    console.error('Error fetching primary vendors:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch primary vendors',
      },
      { status: 500 }
    )
  }
}

