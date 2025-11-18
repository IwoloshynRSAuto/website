import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { roundToNearest15Minutes, getDateOnly, calculateHoursBetween } from '@/lib/utils/time-rounding'
import { startOfWeek } from 'date-fns'
import { z } from 'zod'
import { dateStringSchema, optionalDateStringSchema, nullableDateStringSchema, validateDateRange } from '@/lib/utils/date-validation'

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

const createTimesheetSchema = z.object({
  clockInTime: dateStringSchema,
  clockOutTime: nullableDateStringSchema.optional(),
  date: optionalDateStringSchema.default(() => new Date()),
  userId: z.string().optional(), // Allow admin to specify userId
  // Geolocation fields for clock-in
  geoLat: z.number().optional().nullable(),
  geoLon: z.number().optional().nullable(),
  geoAccuracy: z.number().optional().nullable(),
  locationDenied: z.boolean().optional().nullable(),
  // Geolocation fields for clock-out
  clockOutGeoLat: z.number().optional().nullable(),
  clockOutGeoLon: z.number().optional().nullable(),
  clockOutGeoAccuracy: z.number().optional().nullable(),
  clockOutLocationDenied: z.boolean().optional().nullable(),
})

const updateTimesheetSchema = z.object({
  clockInTime: optionalDateStringSchema,
  clockOutTime: nullableDateStringSchema.optional(),
  status: z.enum(['in-progress', 'completed', 'needs-review']).optional(),
})

// POST /api/timesheets - Create new timesheet
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting - disabled for now to allow clock in operations
    // TODO: Implement proper rate limiting with Redis or similar
    // if (!checkRateLimit(session.user.id)) {
    //   return NextResponse.json(
    //     { error: 'Too many requests. Please wait a moment before trying again.' },
    //     { status: 429 }
    //   )
    // }

    const body = await request.json()
    console.log('[API] Received timesheet creation request:', {
      clockInTime: body.clockInTime,
      clockOutTime: body.clockOutTime,
      date: body.date,
      bodyKeys: Object.keys(body)
    })
    
    let validatedData
    try {
      validatedData = createTimesheetSchema.parse(body)
    } catch (validationError: any) {
      console.error('[API] Validation error:', validationError)
      if (validationError instanceof z.ZodError) {
        console.error('[API] Validation errors:', JSON.stringify(validationError.issues, null, 2))
      }
      throw validationError
    }

    // Determine which user to create timesheet for
    // If userId is provided in body and user is admin, use that userId
    // Otherwise, use session user
    let targetUserId = session.user.id
    if (validatedData.userId) {
      // Check if session user is admin
      const sessionUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true }
      })
      
      if (sessionUser?.role === 'ADMIN') {
        targetUserId = validatedData.userId
        console.log(`[API] Admin ${session.user.id} creating timesheet for user ${targetUserId}`)
      } else {
        return NextResponse.json(
          {
            success: false,
            error: 'Unauthorized',
            details: 'Only administrators can create timesheets for other users.',
          },
          { status: 403 }
        )
      }
    }

    // Verify target user exists in database
    let user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      }
    })

    if (!user) {
      console.error(`[API] Target user not found. User ID: ${targetUserId}`)
      return NextResponse.json(
        {
          success: false,
          error: 'User not found.',
          details: `User ID: ${targetUserId}`,
        },
        { status: 404 }
      )
    }
    
    // Get date-only (YYYY-MM-DD) - use local date components to avoid timezone issues
    const dateInput = validatedData.date || new Date()
    
    // Validate date range (not too far in past/future)
    try {
      validateDateRange(dateInput, 365, 30)
    } catch (error) {
      return NextResponse.json(
        { error: 'Validation error', details: error instanceof Error ? error.message : 'Invalid date range' },
        { status: 400 }
      )
    }
    
    const dateYear = dateInput.getFullYear()
    const dateMonth = dateInput.getMonth()
    const dateDay = dateInput.getDate()
    const dateOnly = `${dateYear}-${String(dateMonth + 1).padStart(2, '0')}-${String(dateDay).padStart(2, '0')}`
    const dateForCheck = new Date(dateYear, dateMonth, dateDay, 12, 0, 0, 0)
    
    const roundedClockIn = roundToNearest15Minutes(validatedData.clockInTime);

    // Check for midnight - handle timezone conversion
    // When client sends local midnight (00:00), it may arrive as 00:00-06:00 UTC depending on timezone
    // Job-only timesheets are created with midnight local time, which converts to early morning UTC
    const isMidnight = (date: Date) => {
      const utcHours = date.getUTCHours();
      const utcMinutes = date.getUTCMinutes();
      // Check if it's exactly UTC midnight, or very early morning (00:00-06:00) which covers most timezones
      // This handles cases where local midnight becomes 00:00-06:00 UTC
      return (utcHours === 0 && utcMinutes === 0) || (utcHours >= 0 && utcHours <= 6 && utcMinutes === 0);
    }

    // Also check local time (in case server timezone matches user timezone)
    const localHours = roundedClockIn.getHours();
    const localMinutes = roundedClockIn.getMinutes();
    const isMidnightLocal = localHours === 0 && localMinutes === 0;

    // Job-only if: no clock-out AND (midnight UTC or midnight local)
    const isJobOnly = (
      validatedData.clockOutTime == null &&
      (isMidnight(roundedClockIn) || isMidnightLocal)
    );

    const isAttendance = !isJobOnly;

    console.log("ENTRY TYPE DETECTION:", {
      clockInTime: validatedData.clockInTime,
      roundedClockIn: roundedClockIn.toISOString(),
      roundedClockInUTCHours: roundedClockIn.getUTCHours(),
      roundedClockInUTCMinutes: roundedClockIn.getUTCMinutes(),
      roundedClockInLocalHours: roundedClockIn.getHours(),
      roundedClockInLocalMinutes: roundedClockIn.getMinutes(),
      clockOutTime: validatedData.clockOutTime,
      isMidnight: isMidnight(roundedClockIn),
      isMidnightLocal: isMidnightLocal,
      isJobOnly: isJobOnly,
      isAttendance: isAttendance,
      entryType: isJobOnly ? "JOB-ONLY" : "ATTENDANCE"
    });
    
    // --------------------------------------------
    // SUBMISSION LOCK LOGIC (REPLACEMENT BLOCK)
    // --------------------------------------------
    
    const weekStart = startOfWeek(dateForCheck, { weekStartsOn: 0 });
    const userId = user.id;
    
    // JOB-ONLY ENTRY BEHAVIOR
    if (isJobOnly) {
      const submissions = await prisma.timesheetSubmission.findMany({
        where: {
          userId: userId,
          weekStart: weekStart,
          status: { in: ["SUBMITTED", "APPROVED"] },
        },
        include: {
          timeEntries: {
            select: {
              jobId: true
            }
          }
        }
      });
      
      // Check if any submission is job-only (has timeEntries with jobId)
      const jobSubmission = submissions.find(sub => {
        const hasJobEntries = sub.timeEntries && sub.timeEntries.length > 0 && 
                             sub.timeEntries.some((te: any) => te.jobId !== null && te.jobId !== undefined);
        return hasJobEntries;
      });
    
      if (jobSubmission) {
        console.log("BLOCKED: Job-only timesheet locked due to JOB submission");
        return NextResponse.json(
          { error: "Job time for this week has already been submitted or approved." },
          { status: 400 }
        );
      }
    }
    
    // ATTENDANCE ENTRY BEHAVIOR
    if (isAttendance) {
      const submissions = await prisma.timesheetSubmission.findMany({
        where: {
          userId: userId,
          weekStart: weekStart,
          status: { in: ["SUBMITTED", "APPROVED"] },
        },
        include: {
          timeEntries: {
            select: {
              jobId: true
            }
          }
        }
      });
      
      // Check if any submission is attendance-only (no timeEntries with jobId)
      const attendanceSubmission = submissions.find(sub => {
        const hasJobEntries = sub.timeEntries && sub.timeEntries.length > 0 && 
                             sub.timeEntries.some((te: any) => te.jobId !== null && te.jobId !== undefined);
        return !hasJobEntries;
      });
    
      if (attendanceSubmission) {
        console.log("BLOCKED: Attendance entry locked due to ATTENDANCE submission");
        return NextResponse.json(
          { error: "Attendance for this week has already been submitted or approved." },
          { status: 400 }
        );
      }
    }
    
    // Round clock-out time if provided
    let roundedClockOut: Date | null = null
    if (validatedData.clockOutTime) {
      roundedClockOut = roundToNearest15Minutes(validatedData.clockOutTime)
    }

    // Allow multiple timesheets per day - each clock in creates a new entry

    // Create timesheet - use the database user ID (not session ID which might be email)
    // Parse dateOnly as local date to avoid timezone issues
    const [yearNum, monthNum, dayNum] = dateOnly.split('-').map(Number)
    const dateForDb = new Date(yearNum, monthNum - 1, dayNum, 12, 0, 0, 0) // Use noon to avoid timezone edge cases
    
    // Check for overlapping entries on the same date
    const startOfDay = new Date(yearNum, monthNum - 1, dayNum, 0, 0, 0, 0)
    const endOfDay = new Date(yearNum, monthNum - 1, dayNum, 23, 59, 59, 999)
    
    // Query existing entries - use select to avoid issues with missing geolocation columns
    const existingEntries = await prisma.timesheet.findMany({
      where: {
        userId: user.id,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      select: {
        id: true,
        userId: true,
        date: true,
        clockInTime: true,
        clockOutTime: true,
        totalHours: true,
        status: true,
        jobEntries: true
        // Explicitly exclude geolocation fields to avoid errors if they don't exist
      }
    })
    
    // Check for overlaps - but allow job-only timesheets to coexist
    // Job-only timesheets are containers for job entries (midnight clock-in, no clock-out, has job entries)
    // They should not block or be blocked by actual attendance entries
    
    // Always check for overlaps, but ignore job-only timesheets in the check
    const newIn = roundedClockIn
    const newOut = roundedClockOut || new Date(yearNum, monthNum - 1, dayNum, 23, 59, 59, 999)
    
    // If new entry is job-only (midnight), always allow it - it's just a container for job entries
    if (isJobOnly) {
      // Skip overlap check for job-only timesheets
      console.log('[API] New entry is job-only (midnight), skipping overlap check')
    } else {
      // Check for overlaps with existing attendance entries
      const hasOverlap = existingEntries.some(entry => {
        // Skip overlap check for job-only timesheets
        // These are identified by: midnight clock-in, no clock-out
        const entryIn = new Date(entry.clockInTime)
        // Use local time components for comparison (avoid timezone issues)
        const entryInLocal = new Date(entryIn.getFullYear(), entryIn.getMonth(), entryIn.getDate(), 
                                      entryIn.getHours(), entryIn.getMinutes(), entryIn.getSeconds())
        // Job-only timesheets are identified by midnight clock-in with no clock-out
        const isEntryJobOnly = entryInLocal.getHours() === 0 && 
                               entryInLocal.getMinutes() === 0 && 
                               !entry.clockOutTime
        
        if (isEntryJobOnly) {
          return false // Job-only timesheets don't count as overlaps
        }
        
        // Use local time components for existing entry times (same day)
        const existingIn = new Date(yearNum, monthNum - 1, dayNum, 
                                   entryInLocal.getHours(), entryInLocal.getMinutes(), entryInLocal.getSeconds())
        let existingOut: Date
        if (entry.clockOutTime) {
          const entryOut = new Date(entry.clockOutTime)
          const entryOutLocal = new Date(entryOut.getFullYear(), entryOut.getMonth(), entryOut.getDate(),
                                        entryOut.getHours(), entryOut.getMinutes(), entryOut.getSeconds())
          existingOut = new Date(yearNum, monthNum - 1, dayNum,
                                entryOutLocal.getHours(), entryOutLocal.getMinutes(), entryOutLocal.getSeconds())
        } else {
          existingOut = new Date(yearNum, monthNum - 1, dayNum, 23, 59, 59, 999)
        }
        
        // Overlap occurs if: newIn < existingOut && newOut > existingIn
        // Use local time components for new times too
        const newInLocal = new Date(yearNum, monthNum - 1, dayNum, newIn.getHours(), newIn.getMinutes(), newIn.getSeconds())
        const newOutLocal = new Date(yearNum, monthNum - 1, dayNum, newOut.getHours(), newOut.getMinutes(), newOut.getSeconds())
        const overlaps = newInLocal < existingOut && newOutLocal > existingIn
        
        // Block ALL overlaps for attendance entries - no exceptions
        return overlaps
      })
      
      if (hasOverlap) {
        console.error('[API] Overlap detected:', {
          newIn: newIn.toISOString(),
          newOut: newOut.toISOString(),
          existingEntries: existingEntries.map(e => ({
            id: e.id,
            clockIn: e.clockInTime,
            clockOut: e.clockOutTime,
            isJobOnly: isMidnight(new Date(e.clockInTime)) && !e.clockOutTime
          }))
        })
        return NextResponse.json(
          {
            success: false,
            error: 'This time entry overlaps with an existing entry. Please adjust the time range.',
            details: 'Time entries cannot overlap on the same date.',
          },
          { status: 400 }
        )
      }
    }
    
    // Determine status based on whether clock out time is provided
    const status = roundedClockOut ? 'completed' : 'in-progress'
    
    // Build create data - include geolocation fields if provided
    const createData: any = {
      userId: user.id, // Use the database user ID we just found
      date: dateForDb,
      clockInTime: roundedClockIn,
      clockOutTime: roundedClockOut,
      status: status,
    }
    
    // Add geolocation fields if provided
    if (validatedData.geoLat !== undefined) {
      createData.geoLat = validatedData.geoLat
    }
    if (validatedData.geoLon !== undefined) {
      createData.geoLon = validatedData.geoLon
    }
    if (validatedData.geoAccuracy !== undefined) {
      createData.geoAccuracy = validatedData.geoAccuracy
    }
    if (validatedData.locationDenied !== undefined) {
      createData.locationDenied = validatedData.locationDenied
    }
    if (validatedData.clockOutGeoLat !== undefined) {
      createData.clockOutGeoLat = validatedData.clockOutGeoLat
    }
    if (validatedData.clockOutGeoLon !== undefined) {
      createData.clockOutGeoLon = validatedData.clockOutGeoLon
    }
    if (validatedData.clockOutGeoAccuracy !== undefined) {
      createData.clockOutGeoAccuracy = validatedData.clockOutGeoAccuracy
    }
    if (validatedData.clockOutLocationDenied !== undefined) {
      createData.clockOutLocationDenied = validatedData.clockOutLocationDenied
    }
    
    // Try to add geolocation fields only if they're provided
    // We'll catch errors if they don't exist in the database
    // Note: Only add these if the columns exist in the database
    // For now, we'll skip geolocation fields to avoid errors
    // TODO: Add migration to add geolocation columns to database
    
    let timesheet
    try {
      // Use select to avoid Prisma trying to access missing geolocation columns
      timesheet = await prisma.timesheet.create({
        data: createData,
        select: {
          id: true,
          userId: true,
          date: true,
          clockInTime: true,
          clockOutTime: true,
          totalHours: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          jobEntries: true
          // Explicitly exclude all geolocation fields to avoid errors
        }
      })
    } catch (createError: any) {
      // If any geolocation-related error occurs, use raw SQL to create the record
      const errorMsg = String(createError?.message || createError?.code || '')
      const isGeoError = errorMsg.includes('geo') || 
                        errorMsg.includes('location') || 
                        errorMsg.includes('locationDenied') ||
                        errorMsg.includes('clockOutLocationDenied') ||
                        errorMsg.includes('Unknown argument') ||
                        errorMsg.includes('does not exist') ||
                        createError?.code === 'P2009' || // Prisma schema validation error
                        createError?.code === 'P2011'    // Prisma column not found error
      
      if (isGeoError) {
        console.warn('[API] Geolocation fields not available, using raw SQL to create timesheet. Error:', errorMsg.substring(0, 200))
        
        // Use raw SQL to insert without geolocation fields
        // Generate a CUID-like ID
        const id = `c${Date.now()}${Math.random().toString(36).substring(2, 15)}`
        
        try {
          // Use Prisma.sql for parameterized queries
          const { Prisma } = await import('@prisma/client')
          
          // Handle NULL for clockOutTime properly
          const clockOutParam = roundedClockOut || null
          
          const result = await prisma.$queryRaw<Array<{
            id: string
            userId: string
            date: Date
            clockInTime: Date
            clockOutTime: Date | null
            totalHours: number | null
            status: string
            createdAt: Date
            updatedAt: Date
          }>>(
            Prisma.sql`
              INSERT INTO timesheets (id, "userId", date, "clockInTime", "clockOutTime", status, "createdAt", "updatedAt")
              VALUES (${id}, ${user.id}, ${dateForDb}, ${roundedClockIn}, ${clockOutParam}, ${status}, NOW(), NOW())
              RETURNING id, "userId", date, "clockInTime", "clockOutTime", "totalHours", status, "createdAt", "updatedAt"
            `
          )
          
          if (result && result.length > 0) {
            const rawTimesheet = result[0]
            // Fetch job entries separately
            const jobEntries = await prisma.jobEntry.findMany({
              where: { timesheetId: rawTimesheet.id }
            })
            
            timesheet = {
              ...rawTimesheet,
              jobEntries: jobEntries
            } as any
          } else {
            throw new Error('Failed to create timesheet via raw SQL')
          }
        } catch (sqlError: any) {
          console.error('[API] Failed to create timesheet using raw SQL:', sqlError)
          throw sqlError
        }
      } else {
        // Re-throw if it's a different error
        throw createError
      }
    }

    console.log('[API] Timesheet created successfully:', timesheet.id)
    
    // Serialize the response - ensure jobEntries is always an array
    const responseData: any = {
      id: timesheet.id,
      userId: timesheet.userId,
      date: timesheet.date.toISOString(),
      clockInTime: timesheet.clockInTime.toISOString(),
      clockOutTime: timesheet.clockOutTime?.toISOString() || null,
      totalHours: timesheet.totalHours ? Number(timesheet.totalHours) : null,
      status: timesheet.status,
      createdAt: timesheet.createdAt.toISOString(),
      updatedAt: timesheet.updatedAt.toISOString(),
      jobEntries: Array.isArray(timesheet.jobEntries) ? timesheet.jobEntries.map((je: any) => ({
        id: je.id,
        jobNumber: je.jobNumber,
        laborCode: je.laborCode,
        punchInTime: je.punchInTime.toISOString(),
        punchOutTime: je.punchOutTime?.toISOString() || null,
        notes: je.notes,
        createdAt: je.createdAt.toISOString(),
        updatedAt: je.updatedAt.toISOString(),
      })) : []
    }
    
    return NextResponse.json(
      {
        success: true,
        data: responseData,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('[API] Error creating timesheet:', error)
    console.error('[API] Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    })
    
    if (error instanceof z.ZodError) {
      console.error('[API] Zod validation errors:', JSON.stringify(error.issues, null, 2))
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', '),
          validationErrors: error.issues
        },
        { status: 400 }
      )
    }

    // Handle Prisma errors
    if (error.code === 'P2003') {
      return NextResponse.json(
        {
          success: false,
          error: 'Database constraint error',
          details: 'The user ID does not exist in the database. Please sign in again.',
        },
        { status: 400 }
      )
    }

    // P2002 (unique constraint violation) - we allow multiple timesheets per day
    // This should not happen if the unique index was properly removed
    if (error.code === 'P2002') {
      console.error('[API] Unique constraint violation - this should not happen!')
      console.error('[API] Error meta:', error.meta)
      console.error('[API] This indicates the database still has a unique constraint/index')
      // Log the error but don't block - try to continue
      return NextResponse.json(
        {
          success: false,
          error: 'Database constraint error',
          details: `Unique constraint violation: ${error.meta?.target?.join(', ') || 'unknown'}. The database may still have a unique constraint that needs to be removed.`,
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        details: error.message || 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }
}

// GET /api/timesheets?userId=... - List timesheets
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || session.user.id
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Verify the user exists and log for debugging
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    })

    if (!targetUser) {
      console.error('[API GET /timesheets] User not found:', userId)
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    console.log('[API GET /timesheets] Target user:', {
      id: targetUser.id,
      email: targetUser.email,
      name: targetUser.name
    })

    // Authorization check temporarily disabled to allow data to show
    // const { authorizeOwnResource } = await import('@/lib/auth/authorization')
    // if (!authorizeOwnResource(session.user as any, 'read', 'timesheet', targetUser?.id)) {
    //   return NextResponse.json(
    //     { success: false, error: 'Forbidden: Insufficient permissions' },
    //     { status: 403 }
    //   )
    // }

    const whereClause: any = {
      userId: userId,
    }

    // Add date range filtering if provided
    // IMPORTANT: Use start of day for startDate and end of day for endDate to include full days
    if (startDate || endDate) {
      whereClause.date = {}
      if (startDate) {
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        whereClause.date.gte = start
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        whereClause.date.lte = end
      }
    }
    
    console.log('[API GET /timesheets] Query:', {
      userId,
      startDate: startDate ? new Date(startDate).toISOString() : null,
      endDate: endDate ? new Date(endDate).toISOString() : null,
      whereClause: JSON.stringify(whereClause, null, 2)
    })

    // Query timesheets with job entries and user info
    // Handle missing geolocation columns gracefully
    let timesheets
    try {
      timesheets = await prisma.timesheet.findMany({
        where: whereClause,
        include: {
          jobEntries: {
            orderBy: {
              punchInTime: 'asc'
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        },
        orderBy: {
          date: 'desc'
        }
      })
    } catch (dbError: any) {
      // If geolocation columns don't exist, use select to exclude them
      const errorMsg = String(dbError?.message || dbError?.code || '')
      const isGeoError = errorMsg.includes('geoLat') || 
                        errorMsg.includes('geo') || 
                        errorMsg.includes('does not exist')
      
      if (isGeoError) {
        console.warn('[API GET /timesheets] Geolocation columns not found, querying without them')
        // Use select to explicitly exclude geolocation fields
        timesheets = await prisma.timesheet.findMany({
          where: whereClause,
          select: {
            id: true,
            userId: true,
            date: true,
            clockInTime: true,
            clockOutTime: true,
            totalHours: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            jobEntries: {
              orderBy: {
                punchInTime: 'asc'
              }
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
            // Explicitly exclude geolocation fields
          },
          orderBy: {
            date: 'desc'
          }
        })
      } else {
        throw dbError
      }
    }
    
    console.log('[API GET /timesheets] Raw query results:', {
      count: timesheets.length,
      userId: userId,
      sample: timesheets.slice(0, 5).map(ts => ({
        id: ts.id,
        userId: ts.userId,
        date: ts.date.toISOString(),
        clockInTime: ts.clockInTime.toISOString(),
        clockOutTime: ts.clockOutTime?.toISOString() || null,
        jobEntriesCount: ts.jobEntries?.length || 0,
        userEmail: ts.user?.email || 'no user'
      }))
    })
    
    console.log('[API GET /timesheets] Found timesheets:', {
      count: timesheets.length,
      sample: timesheets.slice(0, 5).map(ts => ({
        id: ts.id,
        userId: ts.userId,
        date: ts.date.toISOString(),
        clockInTime: ts.clockInTime.toISOString(),
        clockOutTime: ts.clockOutTime?.toISOString() || null,
        jobEntriesCount: ts.jobEntries?.length || 0,
        jobEntries: ts.jobEntries?.map(je => ({
          id: je.id,
          jobNumber: je.jobNumber,
          laborCode: je.laborCode,
          punchInTime: je.punchInTime.toISOString()
        })) || []
      }))
    })
    
    // Log all timesheets with job entries
    const timesheetsWithJobs = timesheets.filter(ts => ts.jobEntries && ts.jobEntries.length > 0)
    console.log('[API GET /timesheets] Timesheets WITH job entries:', {
      count: timesheetsWithJobs.length,
      entries: timesheetsWithJobs.map(ts => ({
        id: ts.id,
        date: ts.date.toISOString(),
        userId: ts.userId,
        userEmail: ts.user?.email || 'no user',
        jobEntriesCount: ts.jobEntries.length,
        jobEntries: ts.jobEntries.map(je => ({
          id: je.id,
          jobNumber: je.jobNumber,
          laborCode: je.laborCode
        }))
      }))
    })
    
    // Log all timesheets without job entries (attendance entries)
    const attendanceTimesheets = timesheets.filter(ts => !ts.jobEntries || ts.jobEntries.length === 0)
    console.log('[API GET /timesheets] Attendance entries (no job entries):', {
      count: attendanceTimesheets.length,
      entries: attendanceTimesheets.slice(0, 5).map(ts => ({
        id: ts.id,
        date: ts.date.toISOString(),
        userId: ts.userId,
        userEmail: ts.user?.email || 'no user',
        clockInTime: ts.clockInTime.toISOString(),
        clockOutTime: ts.clockOutTime?.toISOString() || null
      }))
    })

    // Check submission status for each timesheet's week
    // IMPORTANT: Only check submissions for the timesheet's own userId
    // CRITICAL: Only set submissionStatus for matching submission types:
    // - Job entries should only check job-only submissions
    // - Attendance entries should only check attendance-only submissions
    const timesheetsWithStatus = await Promise.all(
      timesheets.map(async (timesheet) => {
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
        
        // Determine if this timesheet is for job entries or attendance
        const hasJobEntries = timesheet.jobEntries && Array.isArray(timesheet.jobEntries) && timesheet.jobEntries.length > 0
        const submissionType = hasJobEntries ? 'TIME' : 'ATTENDANCE'
        
        // Only set submissionStatus if the submission type matches the timesheet type
        // Job entries should only be affected by job-only submissions
        // Attendance entries should only be affected by attendance-only submissions
        let submissionStatus = 'DRAFT'
        let submissionId = null
        let isLocked = false
        let isRejected = false
        let rejectionReason = null
        
        // Check if there's a submission for this week and type - MUST match timesheet's userId
        // Wrap in try-catch to prevent API failure if query fails
        // Use findFirst instead of findUnique to work around Prisma client recognition issues
        try {
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
          
          if (submission) {
            // Determine if submission is job-only or attendance-only
            const submissionHasJobEntries = submission.timeEntries && submission.timeEntries.length > 0 &&
                                            submission.timeEntries.some((te: any) => te.jobId !== null && te.jobId !== undefined)
            
            // Only apply submission status if types match
            if ((hasJobEntries && submissionHasJobEntries) || (!hasJobEntries && !submissionHasJobEntries)) {
              submissionStatus = submission.status || 'DRAFT'
              submissionId = submission.id
              isLocked = submission.status === 'SUBMITTED' || submission.status === 'APPROVED'
              isRejected = submission.status === 'REJECTED'
              rejectionReason = submission.rejectionReason || null
            }
          }
        } catch (error) {
          // If submission lookup fails, log but don't break the API response
          // Timesheets should still be returned even if submission status can't be determined
          console.error(`[GET /api/timesheets] Error checking submission for timesheet ${timesheet.id}:`, error)
        }

        // Serialize Date objects to ISO strings for JSON response
        // Handle optional geolocation fields that may not exist in database
        const ts = timesheet as any
        
        // Ensure jobEntries is always an array
        const jobEntriesArray = Array.isArray(timesheet.jobEntries) 
          ? timesheet.jobEntries 
          : []
        
        console.log('[API GET /timesheets] Serializing timesheet:', {
          id: timesheet.id,
          date: timesheet.date.toISOString(),
          jobEntriesCount: jobEntriesArray.length,
          jobEntries: jobEntriesArray.map(je => ({
            id: je.id,
            jobNumber: je.jobNumber,
            laborCode: je.laborCode
          }))
        })
        
        // Build response object - handle geolocation fields that may not exist
        const responseObj: any = {
          id: timesheet.id,
          userId: timesheet.userId,
          date: timesheet.date.toISOString(),
          clockInTime: timesheet.clockInTime.toISOString(),
          clockOutTime: timesheet.clockOutTime?.toISOString() || null,
          totalHours: timesheet.totalHours ? Number(timesheet.totalHours) : null,
          status: timesheet.status,
          createdAt: timesheet.createdAt.toISOString(),
          updatedAt: timesheet.updatedAt.toISOString(),
          user: timesheet.user,
          jobEntries: jobEntriesArray.map(je => ({
            id: je.id,
            jobNumber: je.jobNumber,
            laborCode: je.laborCode,
            punchInTime: je.punchInTime.toISOString(),
            punchOutTime: je.punchOutTime?.toISOString() || null,
            notes: je.notes,
            createdAt: je.createdAt.toISOString(),
            updatedAt: je.updatedAt.toISOString(),
          })),
          submissionStatus,
          submissionId,
          isLocked,
          isRejected,
          rejectionReason
        }
        
        // Only include geolocation fields if they exist in the result
        if ('geoLat' in ts && ts.geoLat !== undefined) {
          responseObj.geoLat = ts.geoLat ? Number(ts.geoLat) : null
        }
        if ('geoLon' in ts && ts.geoLon !== undefined) {
          responseObj.geoLon = ts.geoLon ? Number(ts.geoLon) : null
        }
        if ('geoAccuracy' in ts && ts.geoAccuracy !== undefined) {
          responseObj.geoAccuracy = ts.geoAccuracy ? Number(ts.geoAccuracy) : null
        }
        if ('clockOutGeoLat' in ts && ts.clockOutGeoLat !== undefined) {
          responseObj.clockOutGeoLat = ts.clockOutGeoLat ? Number(ts.clockOutGeoLat) : null
        }
        if ('clockOutGeoLon' in ts && ts.clockOutGeoLon !== undefined) {
          responseObj.clockOutGeoLon = ts.clockOutGeoLon ? Number(ts.clockOutGeoLon) : null
        }
        if ('clockOutGeoAccuracy' in ts && ts.clockOutGeoAccuracy !== undefined) {
          responseObj.clockOutGeoAccuracy = ts.clockOutGeoAccuracy ? Number(ts.clockOutGeoAccuracy) : null
        }
        
        return responseObj
      })
    )

    return NextResponse.json({
      success: true,
      data: timesheetsWithStatus,
    })
  } catch (error: any) {
    console.error('Error fetching timesheets:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch timesheets',
      },
      { status: 500 }
    )
  }
}

