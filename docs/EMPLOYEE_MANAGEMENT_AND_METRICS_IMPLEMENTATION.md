# Employee Management and Metrics System - Complete Implementation Guide

This document provides a complete step-by-step implementation of the Employee Management and Metrics system with hierarchical approvals and analytics.

## Table of Contents

1. [Database Schema Updates](#1-database-schema-updates)
2. [Backend APIs](#2-backend-apis)
3. [Metrics Calculation Services](#3-metrics-calculation-services)
4. [Frontend Components](#4-frontend-components)
5. [Testing Instructions](#5-testing-instructions)

---

## 1. Database Schema Updates

### Step 1.1: Update Prisma Schema

Add the following to `prisma/schema.prisma`:

```prisma
// Add managerId field to User model (add after line 18)
model User {
  // ... existing fields ...
  managerId            String?
  manager              User?                @relation("EmployeeManager", fields: [managerId], references: [id], onDelete: SetNull)
  directReports        User[]               @relation("EmployeeManager")
  // ... rest of existing relations ...
}

// Add new AuditLog model at the end of the file
model AuditLog {
  id            String   @id @default(cuid())
  userId        String
  action        String   // CREATE, UPDATE, DELETE, APPROVE, REJECT, SUBMIT
  resourceType  String   // USER, TIME_OFF_REQUEST, EXPENSE_REPORT, TIME_CHANGE_REQUEST, etc.
  resourceId    String?
  details       Json?    // Additional details about the action
  ipAddress     String?
  userAgent     String?
  createdAt     DateTime @default(now())
  user          User     @relation("AuditLogs", fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([resourceType])
  @@index([action])
  @@index([createdAt])
  @@map("audit_logs")
}

// Add QuoteLostReason model for tracking lost quotes
model QuoteLostReason {
  id          String   @id @default(cuid())
  quoteId     String   @unique
  reason      String   // PRICE, TIMELINE, SPECIFICATIONS, COMPETITOR, OTHER
  details     String?
  createdAt   DateTime @default(now())
  quote       Quote    @relation(fields: [quoteId], references: [id], onDelete: Cascade)

  @@index([reason])
  @@map("quote_lost_reasons")
}
```

### Step 1.2: Update User Model Relations

In the User model, add these relations:

```prisma
auditLogs              AuditLog[]            @relation("AuditLogs")
```

### Step 1.3: Update Quote Model

Add to Quote model:

```prisma
lostReason             QuoteLostReason?
```

### Step 1.4: Run Migration

```bash
cd /opt/timekeeping-portal
npx prisma migrate dev --name add_employee_hierarchy_and_audit
npx prisma generate
```

---

## 2. Backend APIs

### Step 2.1: Employee Management API

Create `app/api/employees/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { authorize } from '@/lib/auth/authorization'
import { z } from 'zod'

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

    if (!authorize(session.user, 'read', 'user')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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

    const employees = await prisma.user.findMany({
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

    return NextResponse.json({ employees })
  } catch (error) {
    console.error('Error fetching employees:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/employees - Create new employee
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!authorize(session.user, 'create', 'user')) {
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

    return NextResponse.json({ employee }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error creating employee:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

Create `app/api/employees/[id]/route.ts`:

```typescript
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
```

### Step 2.2: Approval Workflow APIs

Create `app/api/approvals/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { authorize } from '@/lib/auth/authorization'

// GET /api/approvals - Get pending approvals for current user (manager)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        directReports: {
          select: { id: true },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const subordinateIds = user.directReports.map(r => r.id)

    // Get pending approvals from subordinates
    const [timeOffRequests, expenseReports, timeChangeRequests] = await Promise.all([
      prisma.timeOffRequest.findMany({
        where: {
          userId: { in: subordinateIds },
          status: 'PENDING',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { submittedAt: 'desc' },
      }),
      prisma.expenseReport.findMany({
        where: {
          userId: { in: subordinateIds },
          status: 'SUBMITTED',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          job: {
            select: {
              id: true,
              jobNumber: true,
              title: true,
            },
          },
        },
        orderBy: { submittedAt: 'desc' },
      }),
      prisma.timeChangeRequest.findMany({
        where: {
          userId: { in: subordinateIds },
          status: 'PENDING',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { submittedAt: 'desc' },
      }),
    ])

    return NextResponse.json({
      timeOffRequests,
      expenseReports,
      timeChangeRequests,
    })
  } catch (error) {
    console.error('Error fetching approvals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

Create `app/api/approvals/time-off/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { authorize } from '@/lib/auth/authorization'
import { z } from 'zod'

const approveSchema = z.object({
  action: z.enum(['approve', 'reject']),
  rejectionReason: z.string().optional(),
})

// PATCH /api/approvals/time-off/[id] - Approve or reject time off request
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { action, rejectionReason } = approveSchema.parse(body)

    const request = await prisma.timeOffRequest.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            manager: true,
          },
        },
      },
    })

    if (!request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Check if user is the manager of the requester
    const isManager = request.user.managerId === session.user.id
    const isAdmin = authorize(session.user, 'approve', 'time_off_request')

    if (!isManager && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (request.status !== 'PENDING') {
      return NextResponse.json({ error: 'Request already processed' }, { status: 400 })
    }

    const updateData: any = {}
    if (action === 'approve') {
      updateData.status = 'APPROVED'
      updateData.approvedAt = new Date()
      updateData.approvedById = session.user.id
    } else {
      updateData.status = 'REJECTED'
      updateData.rejectedAt = new Date()
      updateData.rejectedById = session.user.id
      updateData.rejectionReason = rejectionReason || 'No reason provided'
    }

    const updated = await prisma.timeOffRequest.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
          },
        },
        rejectedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: action === 'approve' ? 'APPROVE' : 'REJECT',
        resourceType: 'TIME_OFF_REQUEST',
        resourceId: id,
        details: {
          employeeId: request.userId,
          action,
          rejectionReason: action === 'reject' ? rejectionReason : null,
        },
      },
    })

    return NextResponse.json({ request: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error processing approval:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

Similar files needed for expense and time change approvals. Continue with metrics services...

