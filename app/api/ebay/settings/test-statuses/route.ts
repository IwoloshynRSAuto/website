import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/ebay/settings/test-statuses
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const testStatuses = await prisma.ebayTestStatus.findMany({
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({
      success: true,
      data: testStatuses
    })
  } catch (error: any) {
    console.error('[Settings] Error fetching test statuses:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch test statuses'
      },
      { status: 500 }
    )
  }
}

// POST /api/ebay/settings/test-statuses
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

    const testStatus = await prisma.ebayTestStatus.create({
      data: {
        name: name.trim(),
        isActive: true
      }
    })

    return NextResponse.json({
      success: true,
      data: testStatus
    })
  } catch (error: any) {
    console.error('[Settings] Error creating test status:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Test status with this name already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create test status'
      },
      { status: 500 }
    )
  }
}



