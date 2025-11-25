import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/ebay/settings/categories
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const categories = await prisma.ebayCategory.findMany({
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({
      success: true,
      data: categories
    })
  } catch (error: any) {
    console.error('[Settings] Error fetching categories:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch categories'
      },
      { status: 500 }
    )
  }
}

// POST /api/ebay/settings/categories
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

    const category = await prisma.ebayCategory.create({
      data: {
        name: name.trim(),
        isActive: true
      }
    })

    return NextResponse.json({
      success: true,
      data: category
    })
  } catch (error: any) {
    console.error('[Settings] Error creating category:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Category with this name already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create category'
      },
      { status: 500 }
    )
  }
}


