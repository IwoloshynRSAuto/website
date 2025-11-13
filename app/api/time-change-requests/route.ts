import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { roundToNearest15Minutes } from '@/lib/utils/time-rounding'

const createChangeRequestSchema = z.object({
  timesheetId: z.string().optional(),
  requestedClockInTime: z.string().transform((val) => new Date(val)),
  requestedClockOutTime: z.string().transform((val) => new Date(val)).optional().nullable(),
  reason: z.string().min(1, 'Reason is required'),
  date: z.string()
})

// POST /api/time-change-requests - Create a time change request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createChangeRequestSchema.parse(body)

    // Verify user exists
    let user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user && session.user.email) {
      user = await prisma.user.findUnique({
        where: { email: session.user.email }
      })
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found. Please sign in again.' },
        { status: 404 }
      )
    }

    // Round requested times
    const roundedClockIn = roundToNearest15Minutes(validatedData.requestedClockInTime)
    const roundedClockOut = validatedData.requestedClockOutTime 
      ? roundToNearest15Minutes(validatedData.requestedClockOutTime)
      : null

    // Parse date
    const [year, month, day] = validatedData.date.split('-').map(Number)
    const dateForDb = new Date(year, month - 1, day, 12, 0, 0, 0)

    // Get original timesheet values if it exists
    let timesheet = null
    let originalClockIn: Date | null = null
    let originalClockOut: Date | null = null
    
    if (validatedData.timesheetId) {
      timesheet = await prisma.timesheet.findUnique({
        where: { id: validatedData.timesheetId }
      })
      
      if (timesheet) {
        originalClockIn = new Date(timesheet.clockInTime)
        originalClockOut = timesheet.clockOutTime ? new Date(timesheet.clockOutTime) : null
      }
    }

    // Create change request (DO NOT update the timesheet - wait for approval)
    const changeRequest = await prisma.timeChangeRequest.create({
      data: {
        timesheetId: validatedData.timesheetId || null,
        userId: user.id,
        date: dateForDb,
        originalClockInTime: originalClockIn || roundedClockIn, // Use requested time if no original
        originalClockOutTime: originalClockOut,
        requestedClockInTime: roundedClockIn,
        requestedClockOutTime: roundedClockOut,
        reason: validatedData.reason,
        status: 'PENDING'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        timesheet: true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Change request submitted successfully. Waiting for admin approval.',
      changeRequest
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating change request:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/time-change-requests - List change requests
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const userId = searchParams.get('userId')

    const where: any = {}
    if (status) {
      where.status = status
    }
    
    // Non-admins can only see their own change requests
    if (session.user.role !== 'ADMIN') {
      where.userId = session.user.id
    } else if (userId) {
      where.userId = userId
    }

    const changeRequests = await prisma.timeChangeRequest.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        rejectedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        timesheet: true
      },
      orderBy: {
        submittedAt: 'desc'
      }
    })

    return NextResponse.json(changeRequests)
  } catch (error) {
    console.error('Error fetching change requests:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
