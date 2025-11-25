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

// POST /api/ebay/settings/locations
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      )
    }

    const location = await prisma.ebayStorageLocation.create({
      data: {
        name: name.trim(),
        isActive: true
      }
    })

    return NextResponse.json({
      success: true,
      data: location
    })
  } catch (error: any) {
    console.error('[Settings] Error creating location:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Location with this name already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create location'
      },
      { status: 500 }
    )
  }
}


