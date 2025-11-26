import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// PUT /api/ebay/settings/categories/[id]
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
    const { name, isActive } = body

    const updateData: any = {}
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Name is required' },
          { status: 400 }
        )
      }
      updateData.name = name.trim()
    }
    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive)
    }

    const category = await prisma.ebayCategory.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      data: category
    })
  } catch (error: any) {
    console.error('[Settings] Error updating category:', error)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      )
    }
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Category with this name already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update category'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/ebay/settings/categories/[id]
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

    await prisma.ebayCategory.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully'
    })
  } catch (error: any) {
    console.error('[Settings] Error deleting category:', error)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete category'
      },
      { status: 500 }
    )
  }
}



