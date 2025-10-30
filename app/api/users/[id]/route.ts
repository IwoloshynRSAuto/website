import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
const updateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  email: z.string().email('Invalid email address').optional(),
  role: z.enum(['USER', 'MANAGER', 'ADMIN']).optional(),
  position: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  wage: z.number().nullable().optional(),
  isActive: z.boolean().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
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

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Convert Decimal fields to numbers for client compatibility
    const userResponse = {
      ...user,
      wage: user.wage ? Number(user.wage) : null
    }

    return NextResponse.json(userResponse)
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateUserSchema.parse(body)

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // If email is being updated, check for duplicates
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: validatedData.email }
      })

      if (emailExists) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 400 }
        )
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: validatedData,
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
      ...updatedUser,
      wage: updatedUser.wage ? Number(updatedUser.wage) : null
    }

    return NextResponse.json(userResponse)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent deleting the last admin user
    if (existingUser.role === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN' }
      })

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last admin user' },
          { status: 400 }
        )
      }
    }

    // Implement soft deletion - set assignments to NULL instead of deleting
    
    // Set assignedToId to NULL for all jobs assigned to this user
    await prisma.job.updateMany({
      where: { assignedToId: params.id },
      data: { assignedToId: null }
    })

    // Set userId to NULL for all time entries (or keep them but mark as deleted user)
    // We'll keep the time entries but set userId to NULL to preserve historical data
    await prisma.timeEntry.updateMany({
      where: { userId: params.id },
      data: { userId: null }
    })

    // Set approvedById and rejectedById to NULL in timesheet submissions
    await prisma.timesheetSubmission.updateMany({
      where: { approvedById: params.id },
      data: { approvedById: null }
    })

    await prisma.timesheetSubmission.updateMany({
      where: { rejectedById: params.id },
      data: { rejectedById: null }
    })

    // Reassign jobs created by this user to admin (keep this as is)
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    })

    if (adminUser) {
      await prisma.job.updateMany({
        where: { createdById: params.id },
        data: { createdById: adminUser.id }
      })
    }

    // Soft delete: Mark user as inactive instead of deleting
    await prisma.user.update({
      where: { id: params.id },
      data: { 
        isActive: false,
        email: `deleted_${Date.now()}_${existingUser.email}`, // Make email unique for soft deletion
        name: existingUser.name ? `[DELETED] ${existingUser.name}` : '[DELETED] User'
      }
    })

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}