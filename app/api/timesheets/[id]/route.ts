import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { roundToNearest15Minutes, calculateHoursBetween } from '@/lib/utils/time-rounding'
import { startOfWeek } from 'date-fns'
import { z } from 'zod'

// Simple in-memory rate limiting - more lenient for user actions
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 10000 // 10 seconds (shorter window)
const RATE_LIMIT_MAX_REQUESTS = 20 // More requests allowed

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const userLimit = rateLimitMap.get(userId)

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }

  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false
  }

  userLimit.count++
  return true
}

const updateTimesheetSchema = z.object({
  clockInTime: z.string().transform((val) => new Date(val)).optional(),
  clockOutTime: z.union([
    z.string().transform((val) => new Date(val)),
    z.null()
  ]).optional(),
  status: z.enum(['in-progress', 'completed', 'needs-review']).optional(),
  // Geolocation fields for clock-out
  clockOutGeoLat: z.number().optional().nullable(),
  clockOutGeoLon: z.number().optional().nullable(),
  clockOutGeoAccuracy: z.number().optional().nullable(),
  // clockOutLocationDenied: z.boolean().optional().default(false), // Removed - field doesn't exist in database yet
})

// PATCH /api/timesheets/:id - Update timesheet
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Handle Next.js 15 async params
    const resolvedParams = await Promise.resolve(params)
    const timesheetId = resolvedParams.id

    if (!timesheetId) {
      return NextResponse.json(
        { success: false, error: 'Timesheet ID is required' },
        { status: 400 }
      )
    }

    // Rate limiting - disabled for now to allow clock out operations
    // TODO: Implement proper rate limiting with Redis or similar
    // if (!checkRateLimit(session.user.id)) {
    //   return NextResponse.json(
    //     { error: 'Too many requests. Please wait a moment before trying again.' },
    //     { status: 429 }
    //   )
    // }

    const timesheet = await prisma.timesheet.findUnique({
      where: { id: timesheetId },
      include: { jobEntries: true },
    })

    if (!timesheet) {
      return NextResponse.json(
        { success: false, error: 'Timesheet not found' },
        { status: 404 }
      )
    }

    // Verify user exists and get database user ID
    let user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      }
    })

    // If not found by ID, try by email (for old sessions)
    if (!user && session.user.email) {
      user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        }
      })
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found. Please sign in again.',
        },
        { status: 404 }
      )
    }

    // Only allow users to update their own timesheets (unless admin)
    if (timesheet.userId !== user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Check if timesheet is part of a submitted week - MUST match the timesheet's userId
    const timesheetDate = new Date(timesheet.date)
    const weekStartLocal = startOfWeek(timesheetDate, { weekStartsOn: 0 })
    
    // Normalize weekStart to UTC start of day to match database storage
    // IMPORTANT: Database stores weekStart in UTC, so we must normalize for comparison
    // Use local date components (not UTC) since startOfWeek returns local time
    const weekStart = new Date(Date.UTC(
      weekStartLocal.getFullYear(),
      weekStartLocal.getMonth(),
      weekStartLocal.getDate(),
      0, 0, 0, 0
    ))
    
    console.log('[PATCH /api/timesheets/:id] Checking submission for week:', {
      timesheetId: timesheet.id,
      timesheetDate: timesheet.date,
      weekStart: weekStart.toISOString(),
      userId: timesheet.userId
    })
    
    // Determine if this timesheet is for job entries or attendance
    // IMPORTANT: Check the correct submission type based on timesheet content
    const hasJobEntries = timesheet.jobEntries && Array.isArray(timesheet.jobEntries) && timesheet.jobEntries.length > 0
    const submissionType = hasJobEntries ? 'TIME' : 'ATTENDANCE'
    
    // Only check submission for THIS timesheet's user (not the session user)
    // IMPORTANT: Use composite unique constraint with type to check the correct submission type
    // Use findFirst instead of findUnique to work around Prisma client recognition issues
    const submission = await prisma.timesheetSubmission.findFirst({
      where: {
        userId: timesheet.userId, // Use timesheet's userId, not session user
        weekStart: weekStart,
        type: submissionType
      },
      include: {
        timeEntries: {
          select: {
            jobId: true
          }
        }
      }
    })

    console.log('[PATCH /api/timesheets/:id] Submission found:', submission ? {
      id: submission.id,
      status: submission.status,
      timeEntriesCount: submission.timeEntries?.length || 0
    } : 'No submission found')

    // Block updates if timesheet is locked (submitted or approved)
    // Only block if it's an attendance-only submission (no jobId in timeEntries)
    // Job submissions shouldn't block attendance entries
    if (submission && (submission.status === 'SUBMITTED' || submission.status === 'APPROVED')) {
      // Check if this is an attendance-only submission (no job entries)
      // Attendance submissions have empty timeEntries or timeEntries without jobId
      // Job submissions have timeEntries with jobId
      const hasJobEntries = submission.timeEntries && submission.timeEntries.length > 0 && 
                           submission.timeEntries.some((te: any) => te.jobId !== null && te.jobId !== undefined)
      
      console.log('[PATCH /api/timesheets/:id] Submission check:', {
        submissionId: submission.id,
        status: submission.status,
        timeEntriesCount: submission.timeEntries?.length || 0,
        timeEntries: submission.timeEntries,
        hasJobEntries,
        willBlock: !hasJobEntries
      })
      
      // Only block if it's an attendance-only submission
      // If it's a job submission, allow attendance entries to be updated
      if (!hasJobEntries) {
        console.log('[PATCH /api/timesheets/:id] Blocking update - attendance-only submission')
        return NextResponse.json(
          {
            success: false,
            error: 'Cannot update submitted timesheet',
            details: 'This timesheet has been submitted for approval and cannot be modified. Please wait for approval or rejection before making changes.'
          },
          { status: 400 }
        )
      } else {
        console.log('[PATCH /api/timesheets/:id] Allowing update - job submission found, not blocking attendance')
      }
    }

    const body = await request.json()
    console.log('[PATCH /api/timesheets/:id] Request body:', JSON.stringify(body, null, 2))
    
    let validatedData
    try {
      validatedData = updateTimesheetSchema.parse(body)
      console.log('[PATCH /api/timesheets/:id] Validated data:', JSON.stringify(validatedData, null, 2))
    } catch (error: any) {
      console.error('[PATCH /api/timesheets/:id] Validation error:', error)
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation error',
            details: (error as z.ZodError).issues,
          },
          { status: 400 }
        )
      }
      throw error
    }

    console.log('[PATCH /api/timesheets/:id] Building updateData...')
    const updateData: any = {}

    // Round times if provided
    if (validatedData.clockInTime) {
      console.log('[PATCH /api/timesheets/:id] Rounding clockInTime:', validatedData.clockInTime)
      updateData.clockInTime = roundToNearest15Minutes(validatedData.clockInTime)
    }

    if (validatedData.clockOutTime !== undefined) {
      if (validatedData.clockOutTime) {
        console.log('[PATCH /api/timesheets/:id] Rounding clockOutTime:', validatedData.clockOutTime)
        updateData.clockOutTime = roundToNearest15Minutes(validatedData.clockOutTime)
      } else {
        console.log('[PATCH /api/timesheets/:id] Setting clockOutTime to null')
        updateData.clockOutTime = null
      }
    }

    if (validatedData.status) {
      updateData.status = validatedData.status
    }

    // Add geolocation fields for clock-out
    if (validatedData.clockOutGeoLat !== undefined) {
      updateData.clockOutGeoLat = validatedData.clockOutGeoLat
    }
    if (validatedData.clockOutGeoLon !== undefined) {
      updateData.clockOutGeoLon = validatedData.clockOutGeoLon
    }
    if (validatedData.clockOutGeoAccuracy !== undefined) {
      updateData.clockOutGeoAccuracy = validatedData.clockOutGeoAccuracy
    }
    // clockOutLocationDenied removed - field doesn't exist in database yet
    // if (validatedData.clockOutLocationDenied !== undefined) {
    //   updateData.clockOutLocationDenied = validatedData.clockOutLocationDenied
    // }

    // Calculate total hours if both times are present
    const clockIn = updateData.clockInTime || timesheet.clockInTime
    const clockOut = updateData.clockOutTime !== undefined ? updateData.clockOutTime : timesheet.clockOutTime
    
    console.log('[PATCH /api/timesheets/:id] Calculated times:', {
      clockIn: clockIn?.toISOString(),
      clockOut: clockOut?.toISOString(),
      existingClockIn: timesheet.clockInTime?.toISOString(),
      existingClockOut: timesheet.clockOutTime?.toISOString()
    })

    if (clockOut) {
      // Validate that clock out is after clock in
      console.log('[PATCH /api/timesheets/:id] Validating clock out time...')
      if (clockOut < clockIn) {
        console.log('[PATCH /api/timesheets/:id] ERROR: Clock out before clock in')
        return NextResponse.json(
          {
            success: false,
            error: 'Clock out time must be after clock in time',
          },
          { status: 400 }
        )
      }
      console.log('[PATCH /api/timesheets/:id] Calculating total hours...')
      updateData.totalHours = calculateHoursBetween(clockIn, clockOut)
      console.log('[PATCH /api/timesheets/:id] Total hours:', updateData.totalHours)
    } else if (validatedData.clockOutTime === null && timesheet.clockOutTime) {
      // If explicitly setting clockOutTime to null, clear total hours
      updateData.totalHours = null
    }

    // Check for overlapping entries (excluding current entry)
    // Always check for overlaps when times are being modified
    console.log('[PATCH /api/timesheets/:id] Checking for overlaps...')
    if (validatedData.clockInTime || validatedData.clockOutTime !== undefined) {
      const timesheetDate = new Date(timesheet.date)
      const year = timesheetDate.getFullYear()
      const month = timesheetDate.getMonth()
      const day = timesheetDate.getDate()
      const startOfDay = new Date(year, month, day, 0, 0, 0, 0)
      const endOfDay = new Date(year, month, day, 23, 59, 59, 999)
      
      const existingEntries = await prisma.timesheet.findMany({
        where: {
          userId: timesheet.userId,
          date: {
            gte: startOfDay,
            lte: endOfDay
          },
          id: {
            not: timesheetId // Exclude current entry
          }
        },
        include: {
          jobEntries: true
        }
      })
      
      const newIn = clockIn
      const newOut = clockOut || new Date(year, month, day, 23, 59, 59, 999)
      
      const hasOverlap = existingEntries.some(entry => {
        // Skip job-only timesheets (midnight clock-in, no clock-out)
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
        const existingOut = entry.clockOutTime ? new Date(entry.clockOutTime) : new Date(year, month, day, 23, 59, 59, 999)
        
        // Overlap occurs if: newIn < existingOut && newOut > existingIn
        const overlaps = newIn < existingOut && newOut > existingIn
        
        // Block ALL overlaps for attendance entries
        return overlaps
      })
      
      if (hasOverlap) {
        console.log('[PATCH /api/timesheets/:id] ERROR: Overlap detected')
        return NextResponse.json(
          {
            success: false,
            error: 'This time entry overlaps with an existing entry. Please adjust the time range.',
            details: 'Time entries cannot overlap on the same date.',
          },
          { status: 400 }
        )
      }
      console.log('[PATCH /api/timesheets/:id] No overlaps found')
    }

    // If clocking out, auto-close all open job entries
    console.log('[PATCH /api/timesheets/:id] Checking for open job entries to close...')
    if (validatedData.clockOutTime && !timesheet.clockOutTime) {
      console.log('[PATCH /api/timesheets/:id] Clocking out - checking job entries...')
      try {
        const openJobs = Array.isArray(timesheet.jobEntries) ? timesheet.jobEntries.filter(job => !job.punchOutTime) : []
        console.log('[PATCH /api/timesheets/:id] Open job entries:', openJobs.length)
        if (openJobs.length > 0) {
          console.log('[PATCH /api/timesheets/:id] Auto-closing', openJobs.length, 'open job entries')
          await prisma.jobEntry.updateMany({
            where: {
              id: { in: openJobs.map(j => j.id) },
              punchOutTime: null
            },
            data: {
              punchOutTime: roundToNearest15Minutes(validatedData.clockOutTime)
            }
          })
          console.log('[PATCH /api/timesheets/:id] Job entries closed')
        }
      } catch (error: any) {
        console.error('[PATCH /api/timesheets/:id] Error closing job entries:', error)
        throw error
      }
    }

    console.log('[PATCH /api/timesheets/:id] About to update timesheet...')
    
    // Only include valid fields that exist in the Timesheet model
    // Note: clockOutLocationDenied may not exist in database yet - check before including
    const validUpdateData: any = {}
    const allowedFields = [
      'clockInTime',
      'clockOutTime',
      'status',
      'totalHours',
      'geoLat',
      'geoLon',
      'geoAccuracy',
      'locationDenied',
      'clockOutGeoLat',
      'clockOutGeoLon',
      'clockOutGeoAccuracy'
      // 'clockOutLocationDenied' - Commented out until database migration is run
    ]
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        validUpdateData[field] = updateData[field]
      }
    }
    
    console.log('[PATCH /api/timesheets/:id] Updating timesheet with data:', JSON.stringify(validUpdateData, null, 2))
    
    const updated = await prisma.timesheet.update({
      where: { id: timesheetId },
      data: validUpdateData,
      include: {
        jobEntries: {
          orderBy: {
            punchInTime: 'asc'
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error: any) {
    console.error('Error updating timesheet:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.issues,
        },
        { status: 400 }
      )
    }
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update timesheet',
      },
      { status: 500 }
    )
  }
}

// DELETE /api/timesheets/:id - Delete timesheet
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Handle Next.js 15 async params
    const resolvedParams = await Promise.resolve(params)
    const timesheetId = resolvedParams.id

    if (!timesheetId) {
      return NextResponse.json(
        { success: false, error: 'Timesheet ID is required' },
        { status: 400 }
      )
    }

    const timesheet = await prisma.timesheet.findUnique({
      where: { id: timesheetId },
      include: { jobEntries: true },
    })

    if (!timesheet) {
      return NextResponse.json(
        { success: false, error: 'Timesheet not found' },
        { status: 404 }
      )
    }

    // Verify user exists and get database user ID
    let user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      }
    })

    // If not found by ID, try by email (for old sessions)
    if (!user && session.user.email) {
      user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        }
      })
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found. Please sign in again.',
        },
        { status: 404 }
      )
    }

    // Only allow users to delete their own timesheets (unless admin)
    if (timesheet.userId !== user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Delete the timesheet (cascade will delete job entries)
    await prisma.timesheet.delete({
      where: { id: timesheetId },
    })

    return NextResponse.json({
      success: true,
      message: 'Timesheet deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting timesheet:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete timesheet',
      },
      { status: 500 }
    )
  }
}

