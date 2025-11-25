import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/ebay/settings/locations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const locations = await prisma.ebayStorageLocation.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({
      success: true,
      data: locations
    })
  } catch (error: any) {
    console.error('[Settings] Error fetching locations:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch locations'
      },
      { status: 500 }
    )
  }
}


