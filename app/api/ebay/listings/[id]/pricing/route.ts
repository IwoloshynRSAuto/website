import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generatePricingStub } from '@/lib/ebay/ai-stub'

export const dynamic = 'force-dynamic'

// POST /api/ebay/listings/[id]/pricing - Generate pricing suggestions (stub)
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
        aiAnalysis: true
      }
    })

    if (!listing) {
      return NextResponse.json(
        { success: false, error: 'Listing not found' },
        { status: 404 }
      )
    }

    // Generate pricing stub
    const pricing = await generatePricingStub(listing)

    // Update listing with pricing
    await prisma.ebayListing.update({
      where: { id },
      data: {
        suggestedPrice: pricing.suggestedPrice,
        suggestedAuctionPrice: pricing.suggestedAuctionPrice,
        suggestedShipping: pricing.suggestedShipping
      }
    })

    return NextResponse.json({
      success: true,
      data: pricing
    })
  } catch (error: any) {
    console.error('[Listings] Error generating pricing:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate pricing'
      },
      { status: 500 }
    )
  }
}


