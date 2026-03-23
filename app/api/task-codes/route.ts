import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/task-codes
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const activeOnly = searchParams.get('activeOnly') === 'true'

    const where: any = {}
    if (category) where.category = category
    if (activeOnly) where.isActive = true

    let taskCodes
    try {
      taskCodes = await prisma.taskCode.findMany({
        where,
        orderBy: [{ category: 'asc' }, { code: 'asc' }],
      })
    } catch (error: any) {
      // If table doesn't exist, return empty array with helpful message
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        console.warn('[GET /api/task-codes] TaskCode table does not exist. Run migration first.')
        return NextResponse.json({ 
          success: true, 
          data: [],
          message: 'TaskCode table does not exist. Please run: npx prisma migrate dev'
        })
      }
      throw error
    }

    return NextResponse.json({ success: true, data: taskCodes })
  } catch (error: any) {
    console.error('[GET /api/task-codes] Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch task codes' }, { status: 500 })
  }
}

// POST /api/task-codes
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { code, description, category, isActive } = body

    if (!code || !description || !category) {
      return NextResponse.json({ 
        success: false,
        error: 'code, description, and category are required' 
      }, { status: 400 })
    }

    if (!['PM', 'SV', 'AD'].includes(category)) {
      return NextResponse.json({ 
        success: false,
        error: 'category must be PM, SV, or AD' 
      }, { status: 400 })
    }

    const taskCode = await prisma.taskCode.create({
      data: {
        code: code.trim(),
        description: description.trim(),
        category,
        isActive: isActive !== undefined ? isActive : true,
      },
    })

    return NextResponse.json({ success: true, data: taskCode }, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/task-codes] Error:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json({ 
        success: false,
        error: 'A task code with this code already exists' 
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Failed to create task code' 
    }, { status: 500 })
  }
}

