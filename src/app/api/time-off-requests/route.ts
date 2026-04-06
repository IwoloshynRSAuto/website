import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { authorize } from '@/lib/auth/authorization'
import { z } from 'zod'

const timeOffRequestSchema = z.object({
  userId: z.string(),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()),
  requestType: z.enum(['VACATION', 'SICK', 'PERSONAL', 'UNPAID', 'OTHER']),
  reason: z.string().optional(),
  hours: z.number().optional(),
})

// GET /api/time-off-requests - List time off requests
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')

    const where: any = {}
    if (userId) {
      // Users can only see their own requests unless they're admin/manager
      if (userId !== session.user.id && !authorize(session.user, 'read', 'time_off_request')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      where.userId = userId
    } else if (!authorize(session.user, 'read', 'time_off_request')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (status) {
      where.status = status
    }

    const requests = await prisma.timeOffRequest.findMany({
      where,
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
      orderBy: { submittedAt: 'desc' },
    })

    return NextResponse.json({ requests })
  } catch (error) {
    console.error('Error fetching time off requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/time-off-requests - Create time off request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!authorize(session.user, 'create', 'time_off_request')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const data = timeOffRequestSchema.parse(body)

    // Users can only create requests for themselves unless admin
    if (data.userId !== session.user.id && !authorize(session.user, 'create', 'user')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const startDate = typeof data.startDate === 'string' ? new Date(data.startDate) : data.startDate
    const endDate = typeof data.endDate === 'string' ? new Date(data.endDate) : data.endDate

    // Calculate hours if not provided
    let hours = data.hours
    if (!hours) {
      const diffTime = endDate.getTime() - startDate.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
      hours = diffDays * 8 // Assume 8 hours per day
    }

    const timeOffRequest = await prisma.timeOffRequest.create({
      data: {
        userId: data.userId,
        startDate,
        endDate,
        requestType: data.requestType,
        reason: data.reason || null,
        hours,
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
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'SUBMIT',
        resourceType: 'TIME_OFF_REQUEST',
        resourceId: timeOffRequest.id,
        details: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          requestType: data.requestType,
        },
      },
    })

    return NextResponse.json({ request: timeOffRequest }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error creating time off request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

