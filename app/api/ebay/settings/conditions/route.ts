import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/ebay/settings/conditions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const conditions = await prisma.ebayCondition.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({
      success: true,
      data: conditions
    })
  } catch (error: any) {
    console.error('[Settings] Error fetching conditions:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch conditions'
      },
      { status: 500 }
    )
  }
}


