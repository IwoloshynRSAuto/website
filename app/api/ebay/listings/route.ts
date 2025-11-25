import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateDaysSince } from '@/lib/ebay/code-generator'

export const dynamic = 'force-dynamic'

// GET /api/ebay/listings - Get all listings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const categoryId = searchParams.get('categoryId')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const where: any = {}

    // Search filter
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Status filter
    if (status && status !== 'all') {
      where.listingStatus = status
    }

    // Category filter
    if (categoryId && categoryId !== 'all') {
      where.categoryId = categoryId
    }

    // Build orderBy
    const orderBy: any = {}
    if (sortBy === 'category') {
      orderBy.category = { name: sortOrder }
    } else {
      orderBy[sortBy] = sortOrder
    }

    const listings = await prisma.ebayListing.findMany({
      where,
      include: {
        images: {
          take: 1,
          orderBy: { order: 'asc' }
        },
        category: true,
        storageLocation: true,
        aiAnalysis: true,
        alerts: {
          where: { isActive: true }
        },
        _count: {
          select: { alerts: { where: { isActive: true } } }
        }
      },
      orderBy
    })

    // Calculate days since created and add aging alerts
    const listingsWithDays = listings.map(listing => {
      const daysSince = calculateDaysSince(listing.createdAt)
      const needsAlert = daysSince !== null && daysSince > 100
      
      // Check for inspection/testing alerts
      const needsInspectionAlert = listing.needsInspection || 
        listing.conditionText?.toLowerCase().includes('needs inspection') ||
        listing.testStatus?.toLowerCase().includes('needs testing') ||
        listing.conditionText?.toLowerCase().includes('bad condition')

      return {
        ...listing,
        daysSinceCreated: daysSince,
        daysSincePosted: listing.postedDate ? calculateDaysSince(listing.postedDate) : null,
        needsAgingAlert: needsAlert,
        needsInspectionAlert
      }
    })

    return NextResponse.json({
      success: true,
      listings: listingsWithDays
    })
  } catch (error: any) {
    console.error('[Listings] Error fetching listings:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch listings'
      },
      { status: 500 }
    )
  }
}


