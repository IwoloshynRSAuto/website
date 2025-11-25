import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createDraftListingStub } from '@/lib/ebay/ai-stub'

export const dynamic = 'force-dynamic'

// POST /api/ebay/listings/[id]/draft - Create draft listing structure (stub)
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

    const listing = await prisma.ebayListing.findUnique({
      where: { id },
      include: {
        images: true,
        category: true,
        aiAnalysis: true
      }
    })

    if (!listing) {
      return NextResponse.json(
        { success: false, error: 'Listing not found' },
        { status: 404 }
      )
    }

    // Generate draft listing structure (stub)
    const draftData = createDraftListingStub(listing)

    // Save draft data to listing
    await prisma.ebayListing.update({
      where: { id },
      data: {
        ebayDraftData: JSON.stringify(draftData),
        listingStatus: 'ready_to_upload'
      }
    })

    // Create EbayData record
    await prisma.ebayData.upsert({
      where: { listingId: id },
      create: {
        listingId: id,
        status: 'draft_stub',
        itemSpecifics: JSON.stringify(draftData)
      },
      update: {
        status: 'draft_stub',
        itemSpecifics: JSON.stringify(draftData)
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        ...draftData,
        listingId: id
      }
    })
  } catch (error: any) {
    console.error('[Listings] Error creating draft listing:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create draft listing'
      },
      { status: 500 }
    )
  }
}


