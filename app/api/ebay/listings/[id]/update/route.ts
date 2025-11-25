import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST /api/ebay/listings/[id]/update - Update listing (legacy endpoint)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams
    const body = await request.json()

    const updateData: any = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId || null
    if (body.storageLocationId !== undefined) updateData.storageLocationId = body.storageLocationId || null
    if (body.condition !== undefined) updateData.conditionText = body.condition
    if (body.testStatus !== undefined) updateData.testStatus = body.testStatus
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.listingStatus !== undefined) updateData.listingStatus = body.listingStatus

    const listing = await prisma.ebayListing.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      data: listing
    })
  } catch (error: any) {
    console.error('[Listings] Error updating listing:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update listing'
      },
      { status: 500 }
    )
  }
}


