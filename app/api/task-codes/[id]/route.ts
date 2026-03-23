import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// PUT /api/task-codes/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (user?.role !== 'ADMIN' && user?.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams

    const body = await request.json()
    const { code, description, category, isActive } = body

    const updateData: any = {}
    if (code !== undefined) updateData.code = code.trim()
    if (description !== undefined) updateData.description = description.trim()
    if (category !== undefined) {
      if (!['PM', 'SV', 'AD'].includes(category)) {
        return NextResponse.json({ 
          success: false,
          error: 'category must be PM, SV, or AD' 
        }, { status: 400 })
      }
      updateData.category = category
    }
    if (isActive !== undefined) updateData.isActive = isActive

    const taskCode = await prisma.taskCode.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, data: taskCode })
  } catch (error: any) {
    console.error('[PUT /api/task-codes/[id]] Error:', error)
    
    if (error.code === 'P2025') {
      return NextResponse.json({ 
        success: false,
        error: 'Task code not found' 
      }, { status: 404 })
    }
    
    if (error.code === 'P2002') {
      return NextResponse.json({ 
        success: false,
        error: 'A task code with this code already exists' 
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Failed to update task code' 
    }, { status: 500 })
  }
}

// DELETE /api/task-codes/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (user?.role !== 'ADMIN' && user?.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams

    await prisma.taskCode.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[DELETE /api/task-codes/[id]] Error:', error)
    
    if (error.code === 'P2025') {
      return NextResponse.json({ 
        success: false,
        error: 'Task code not found' 
      }, { status: 404 })
    }
    
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Failed to delete task code' 
    }, { status: 500 })
  }
}

