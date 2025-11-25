import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { join } from 'path'
import { existsSync } from 'fs'
import { rm } from 'fs/promises'

export const dynamic = 'force-dynamic'

// GET /api/ebay/listings/[id] - Get listing by ID
export async function GET(
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
        images: {
          orderBy: { order: 'asc' }
        },
        storageLocation: true,
        condition: true,
        category: true,
        aiAnalysis: true,
        ebayData: true,
        alerts: {
          where: { isActive: true }
        }
      }
    })

    if (!listing) {
      return NextResponse.json(
        {
          success: false,
          error: 'Listing not found'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: listing
    })
  } catch (error: any) {
    console.error('[Listings] Error fetching listing:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch listing'
      },
      { status: 500 }
    )
  }
}

// PUT /api/ebay/listings/[id] - Update listing
export async function PUT(
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
    if (body.description !== undefined) updateData.description = body.description
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId || null
    if (body.storageLocationId !== undefined) updateData.storageLocationId = body.storageLocationId || null
    if (body.location !== undefined) updateData.location = body.location
    if (body.conditionId !== undefined) updateData.conditionId = body.conditionId || null
    if (body.condition !== undefined) updateData.conditionText = body.condition // Legacy support
    if (body.testStatus !== undefined) updateData.testStatus = body.testStatus
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.listingStatus !== undefined) updateData.listingStatus = body.listingStatus
    if (body.needsInspection !== undefined) updateData.needsInspection = body.needsInspection
    if (body.needsTesting !== undefined) updateData.needsTesting = body.needsTesting

    const listing = await prisma.ebayListing.update({
      where: { id },
      data: updateData,
      include: {
        images: true,
        category: true,
        storageLocation: true,
        condition: true
      }
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

// DELETE /api/ebay/listings/[id] - Delete listing
export async function DELETE(
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
      select: { id: true }
    })

    if (!listing) {
      return NextResponse.json(
        { success: false, error: 'Listing not found' },
        { status: 404 }
      )
    }

    const listingFolderPath = join(process.cwd(), 'storage', 'listings', id)

    await prisma.ebayListing.delete({
      where: { id }
    })

    if (existsSync(listingFolderPath)) {
      try {
        await rm(listingFolderPath, { recursive: true, force: true })
      } catch (fsError) {
        console.warn('[Listings] Failed to remove listing folder:', fsError)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Listing deleted successfully'
    })
  } catch (error: any) {
    console.error('[Listings] Error deleting listing:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete listing'
      },
      { status: 500 }
    )
  }
}

