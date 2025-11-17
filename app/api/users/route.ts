import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { authorize } from '@/lib/auth/authorization'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['USER', 'MANAGER', 'ADMIN']).default('USER'),
  position: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  wage: z.number().nullable().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!authorize(session.user, 'read', 'user')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('activeOnly') === 'true'

    const whereClause = activeOnly ? { isActive: true } : {}

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        position: true,
        wage: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' }
    })

    // Convert Decimal fields to numbers for client compatibility
    const usersResponse = users.map(user => ({
      ...user,
      wage: user.wage ? Number(user.wage) : null
    }))

    return NextResponse.json({
      success: true,
      data: usersResponse,
    })
  } catch (error: any) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch users',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!authorize(session.user, 'create', 'user')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    console.log('Received user creation request:', body)
    
    const validatedData = createUserSchema.parse(body)
    console.log('Validated data:', validatedData)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Create user (no password needed with Microsoft authentication)
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        role: validatedData.role,
        position: validatedData.position || null,
        phone: validatedData.phone || null,
        wage: validatedData.wage || null,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        position: true,
        wage: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    // Convert Decimal fields to numbers for client compatibility
    const userResponse = {
      ...user,
      wage: user.wage ? Number(user.wage) : null
    }

    return NextResponse.json(
      {
        success: true,
        data: userResponse,
      },
      { status: 201 }
    )
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      )
    }
    console.error('Error creating user:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create user',
      },
      { status: 500 }
    )
  }
}