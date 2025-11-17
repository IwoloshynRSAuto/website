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

    // Check for overlaps with existing entries (excluding the timesheet being modified if it exists)
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0)
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999)

    const existingEntries = await prisma.timesheet.findMany({
      where: {
        userId: user.id,
        date: {
          gte: startOfDay,
          lte: endOfDay
        },
        id: validatedData.timesheetId ? { not: validatedData.timesheetId } : undefined
      },
      include: {
        jobEntries: true
      }
    })

    // Check if this would be a job-only timesheet (midnight clock-in, no clock-out)
    const clockInLocal = new Date(roundedClockIn.getFullYear(), roundedClockIn.getMonth(), roundedClockIn.getDate(),
                                  roundedClockIn.getHours(), roundedClockIn.getMinutes(), roundedClockIn.getSeconds())
    const isJobOnlyTimesheet = clockInLocal.getHours() === 0 && 
                                clockInLocal.getMinutes() === 0 && 
                                !roundedClockOut

    if (!isJobOnlyTimesheet) {
      // Check for overlaps with existing attendance entries
      const newIn = roundedClockIn
      const newOut = roundedClockOut || new Date(year, month - 1, day, 23, 59, 59, 999)

      const hasOverlap = existingEntries.some(entry => {
        // Skip job-only timesheets
        const entryIn = new Date(entry.clockInTime)
        const entryInLocal = new Date(entryIn.getFullYear(), entryIn.getMonth(), entryIn.getDate(), 
                                      entryIn.getHours(), entryIn.getMinutes(), entryIn.getSeconds())
        const isEntryJobOnly = entryInLocal.getHours() === 0 && 
                               entryInLocal.getMinutes() === 0 && 
                               !entry.clockOutTime

        if (isEntryJobOnly) {
          return false // Job-only timesheets don't count as overlaps
        }

        const existingIn = entryIn
        const existingOut = entry.clockOutTime ? new Date(entry.clockOutTime) : new Date(year, month - 1, day, 23, 59, 59, 999)

        // Overlap occurs if: newIn < existingOut && newOut > existingIn
        return newIn < existingOut && newOut > existingIn
      })

      if (hasOverlap) {
        return NextResponse.json(
          {
            success: false,
            error: 'This requested time change would overlap with an existing entry. Please adjust the times.',
            details: 'Time entries cannot overlap on the same date.',
          },
          { status: 400 }
        )
      }
    }

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
