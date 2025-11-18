import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { authorize } from '@/lib/auth/authorization'
import { z } from 'zod'
import { Decimal } from '@prisma/client/runtime/library'

const employeeSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['ADMIN', 'PROJECT_MANAGER', 'ENGINEER', 'TECHNICIAN', 'SALES', 'ACCOUNTING', 'USER']),
  position: z.string().optional(),
  wage: z.number().optional(),
  phone: z.string().optional(),
  managerId: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
})

// GET /api/employees - List all employees with hierarchy
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Allow all authenticated users to read employee list (needed for timesheet user selection)
    // Type assertion needed because session.user.role is string but authorize expects Role type
    // if (!authorize(session.user as any, 'read', 'user')) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    // }

    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'
    const managerId = searchParams.get('managerId')

    const where: any = {}
    if (!includeInactive) {
      where.isActive = true
    }
    if (managerId) {
      where.managerId = managerId
    }

    // Check if managerId column exists, if not return basic employee list
    let employees
    try {
      // Try to query with manager relations first
      employees = await prisma.user.findMany({
        where,
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
        orderBy: { name: 'asc' },
      })
      
      console.log('[API GET /employees] Found employees:', {
        count: employees.length,
        employees: employees.map(emp => ({
          id: emp.id,
          email: emp.email,
          name: emp.name,
          role: emp.role,
          isActive: emp.isActive
        }))
      })
    } catch (dbError: any) {
      // If managerId column doesn't exist, use raw SQL to bypass Prisma schema validation
      if (dbError.message?.includes('managerId') || dbError.message?.includes('does not exist')) {
        console.warn('Manager hierarchy not available - using raw SQL query')
        
        // Build WHERE clause for raw SQL
        const whereClause = !includeInactive ? 'WHERE "isActive" = true' : ''
        
        // Use raw SQL to query only columns that exist (bypasses Prisma schema validation)
        const rawEmployees = await prisma.$queryRawUnsafe<any[]>(
          `SELECT id, email, name, role, position, wage, phone, "isActive", "createdAt", "updatedAt" 
           FROM users 
           ${whereClause}
           ORDER BY name ASC`
        )
        
        // Transform raw results to match expected structure
        employees = rawEmployees.map(emp => ({
          id: emp.id,
          email: emp.email,
          name: emp.name,
          role: emp.role,
          position: emp.position,
          wage: emp.wage,
          phone: emp.phone,
          isActive: emp.isActive,
          createdAt: emp.createdAt,
          updatedAt: emp.updatedAt,
          manager: null,
          directReports: [],
        }))
        
        console.log('[API GET /employees] Found employees (without manager hierarchy):', {
          count: employees.length,
          employees: employees.map(emp => ({
            id: emp.id,
            email: emp.email,
            name: emp.name,
            role: emp.role,
            isActive: emp.isActive
          }))
        })
      } else {
        throw dbError
      }
    }

    return NextResponse.json({ employees })
  } catch (error: any) {
    console.error('Error fetching employees:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

// POST /api/employees - Create new employee
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Type assertion needed because session.user.role is string but authorize expects Role type
    if (!authorize(session.user as any, 'create', 'user')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const data = employeeSchema.parse(body)

    // Check if manager exists and is valid
    if (data.managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: data.managerId },
      })
      if (!manager) {
        return NextResponse.json({ error: 'Manager not found' }, { status: 404 })
      }
    }

    const employee = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        role: data.role,
        position: data.position,
        wage: data.wage ? new Decimal(data.wage) : null,
        phone: data.phone,
        managerId: data.managerId || null,
        isActive: data.isActive,
      },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Create audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'CREATE',
          resourceType: 'USER',
          resourceId: employee.id,
          details: {
            email: employee.email,
            name: employee.name,
            role: employee.role,
          },
        },
      })
    } catch (auditError) {
      // Audit log creation is optional - don't fail the request if it fails
      console.warn('Failed to create audit log:', auditError)
    }

    return NextResponse.json({ employee }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('Error creating employee:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

