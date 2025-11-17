import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { authorize } from '@/lib/auth/authorization'
import { z } from 'zod'
import { Decimal } from '@prisma/client/runtime/library'

const updateEmployeeSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(['ADMIN', 'PROJECT_MANAGER', 'ENGINEER', 'TECHNICIAN', 'SALES', 'ACCOUNTING', 'USER']).optional(),
  position: z.string().optional(),
  wage: z.number().optional(),
  phone: z.string().optional(),
  managerId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

// GET /api/employees/[id] - Get employee details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Users can view their own profile, admins can view anyone
    if (id !== session.user.id && !authorize(session.user, 'read', 'user')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const employee = await prisma.user.findUnique({
      where: { id },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        directReports: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            position: true,
          },
        },
      },
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    return NextResponse.json({ employee })
  } catch (error) {
    console.error('Error fetching employee:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/employees/[id] - Update employee
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!authorize(session.user, 'update', 'user')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const data = updateEmployeeSchema.parse(body)

    // Prevent circular manager relationships
    if (data.managerId === id) {
      return NextResponse.json({ error: 'Employee cannot be their own manager' }, { status: 400 })
    }

    // Check if setting manager would create a cycle
    if (data.managerId) {
      const wouldCreateCycle = await checkManagerCycle(id, data.managerId)
      if (wouldCreateCycle) {
        return NextResponse.json({ error: 'Cannot create circular manager relationship' }, { status: 400 })
      }
    }

    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.role !== undefined) updateData.role = data.role
    if (data.position !== undefined) updateData.position = data.position
    if (data.wage !== undefined) updateData.wage = data.wage ? new Decimal(data.wage) : null
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.managerId !== undefined) updateData.managerId = data.managerId || null
    if (data.isActive !== undefined) updateData.isActive = data.isActive

    const employee = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        directReports: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
          },
        },
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        resourceType: 'USER',
        resourceId: employee.id,
        details: data,
      },
    })

    return NextResponse.json({ employee })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error updating employee:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/employees/[id] - Deactivate employee (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!authorize(session.user, 'delete', 'user')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    // Soft delete - set isActive to false
    const employee = await prisma.user.update({
      where: { id },
      data: { isActive: false },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        resourceType: 'USER',
        resourceId: employee.id,
        details: { email: employee.email, name: employee.name },
      },
    })

    return NextResponse.json({ employee })
  } catch (error) {
    console.error('Error deactivating employee:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to check for circular manager relationships
async function checkManagerCycle(employeeId: string, newManagerId: string): Promise<boolean> {
  let currentId = newManagerId
  const visited = new Set<string>()

  while (currentId) {
    if (visited.has(currentId)) {
      return true // Cycle detected
    }
    if (currentId === employeeId) {
      return true // Would create cycle
    }
    visited.add(currentId)

    const user = await prisma.user.findUnique({
      where: { id: currentId },
      select: { managerId: true },
    })

    if (!user || !user.managerId) {
      break
    }
    currentId = user.managerId
  }

  return false
}

