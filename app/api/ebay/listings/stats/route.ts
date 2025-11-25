import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/ebay/listings/stats - Get listing statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [total, active, sold, alerts] = await Promise.all([
      prisma.ebayListing.count(),
      prisma.ebayListing.count({
        where: {
          listingStatus: {
            in: ['active_listing', 'active']
          }
        }
      }),
      prisma.ebayListing.count({
        where: {
          listingStatus: 'sold'
        }
      }),
      prisma.ebayListing.count({
        where: {
          alerts: {
            some: {
              isActive: true
            }
          }
        }
      })
    ])

    return NextResponse.json({
      success: true,
      data: {
        total,
        active,
        sold,
        alerts
      }
    })
  } catch (error: any) {
    console.error('[Listings] Error fetching stats:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch stats'
      },
      { status: 500 }
    )
  }
}


