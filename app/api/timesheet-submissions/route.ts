import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { startOfWeek, endOfWeek } from 'date-fns'
import { getWeekBoundariesUTC, normalizeWeekStartToUTC, normalizeWeekEndToUTC } from '@/lib/utils/date-utils'
import { dateStringSchema, nullableDateStringSchema, optionalDateStringSchema, validateWeekBoundaries, validateDateInWeek, validateDateRange } from '@/lib/utils/date-validation'
import { ensureJobForTimeSubmission } from '@/lib/timekeeping/ensure-job-for-submission'

const createTimesheetSubmissionSchema = z.object({
  userId: z.string().min(1, 'User is required'),
  weekStart: dateStringSchema,
  weekEnd: dateStringSchema,
  timeEntries: z.array(z.object({
    id: z.string().optional(),
    timesheetId: z.string().optional(), // For attendance entries
    date: dateStringSchema,
    clockInTime: z.preprocess(
      (val) => val === null || val === undefined ? undefined : val,
      optionalDateStringSchema
    ),
    clockOutTime: z.preprocess(
      (val) => val === null || val === undefined ? undefined : val,
      optionalDateStringSchema.nullable()
    ),
    regularHours: z.number().min(0).default(0),
    overtimeHours: z.number().min(0).default(0),
    notes: z.string().nullable().optional(),
    billable: z.boolean().default(true),
    rate: z.number().nullable().optional(),
    jobId: z.string().optional().nullable(), // Optional when jobNumber is sent
    jobNumber: z.string().optional().nullable(), // Resolved to Job on server if jobId missing
    laborCodeId: z.string().optional().nullable()
  }))
})

const updateTimesheetStatusSchema = z.object({
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']),
  rejectionReason: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('POST /api/timesheet-submissions - Request body:', JSON.stringify(body, null, 2))
    console.log('POST /api/timesheet-submissions - Time entries count:', body.timeEntries?.length || 0)
    if (body.timeEntries && body.timeEntries.length > 0) {
      console.log('POST /api/timesheet-submissions - First time entry:', JSON.stringify(body.timeEntries[0], null, 2))
    }
    
    let validatedData
    try {
      validatedData = createTimesheetSubmissionSchema.parse(body)
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        console.error('Zod validation error:', JSON.stringify(validationError.errors, null, 2))
        return NextResponse.json(
          { error: 'Validation error', details: validationError.errors },
          { status: 400 }
        )
      }
      throw validationError
    }

    // Verify user exists and get database user ID
    // Handle missing managerId column
    let user
    try {
      user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          position: true,
          wage: true,
          phone: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
          // Explicitly exclude managerId
        }
      })
    } catch (dbError: any) {
      const errorMsg = String(dbError?.message || dbError?.code || '')
      if (errorMsg.includes('managerId') && errorMsg.includes('does not exist')) {
        // Use raw SQL to fetch user without managerId
        const userResults = await prisma.$queryRaw(
          Prisma.sql`SELECT id, email, name, role, position, wage, phone, "isActive", "createdAt", "updatedAt" FROM users WHERE id = ${session.user.id}`
        ) as any[]
        user = userResults?.[0] || null
      } else {
        throw dbError
      }
    }

    if (!user && session.user.email) {
      try {
        user = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            position: true,
            wage: true,
            phone: true,
            isActive: true,
            createdAt: true,
            updatedAt: true
            // Explicitly exclude managerId
          }
        })
      } catch (dbError: any) {
        const errorMsg = String(dbError?.message || dbError?.code || '')
        if (errorMsg.includes('managerId') && errorMsg.includes('does not exist')) {
          // Use raw SQL to fetch user without managerId
          const userResults = await prisma.$queryRaw(
            Prisma.sql`SELECT id, email, name, role, position, wage, phone, "isActive", "createdAt", "updatedAt" FROM users WHERE email = ${session.user.email}`
          ) as any[]
          user = userResults?.[0] || null
        } else {
          throw dbError
        }
      }
    }

    if (!user) {
      console.error('POST /api/timesheet-submissions - User not found:', {
        sessionUserId: session.user.id,
        sessionUserEmail: session.user.email,
        sessionUserRole: session.user.role
      })
      return NextResponse.json(
        { error: 'User not found. Please sign in again.' },
        { status: 404 }
      )
    }

    console.log('POST /api/timesheet-submissions - User verification:', {
      sessionUserId: session.user.id,
      dbUserId: user.id,
      validatedUserId: validatedData.userId,
      sessionUserRole: session.user.role,
      isAdmin: session.user.role === 'ADMIN',
      userIdsMatch: validatedData.userId === user.id
    })

    // Permission check: Users can only submit their own timesheets (unless admin)
    const { authorizeOwnResource } = await import('@/lib/auth/authorization')
    
    if (!authorizeOwnResource(session.user, 'create', 'timesheet_submission', user.id)) {
      console.error('POST /api/timesheet-submissions - Permission denied:', {
        validatedUserId: validatedData.userId,
        dbUserId: user.id,
        sessionUserRole: session.user.role,
      })
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: You can only submit your own timesheets',
        },
        { status: 403 }
      )
    }

    // Validate and correct weekStart/weekEnd to ensure Sunday-Saturday boundaries
    // This also normalizes to UTC for database storage
    const { weekStart, weekEnd } = validateWeekBoundaries(validatedData.weekStart, validatedData.weekEnd)
    
    // Validate that all time entry dates are within the week boundaries
    for (const entry of validatedData.timeEntries) {
      try {
        validateDateInWeek(entry.date, weekStart, weekEnd)
        // Also validate date range (not too far in past/future)
        validateDateRange(entry.date, 365, 30)
      } catch (error) {
        return NextResponse.json(
          { error: 'Validation error', details: error instanceof Error ? error.message : 'Invalid date in time entry' },
          { status: 400 }
        )
      }
    }
    
    // Determine if this is an attendance-only or job-only submission
    // IMPORTANT: This determines which type of submission we're creating/checking
    // ATTENDANCE submissions have no jobId in timeEntries
    // TIME submissions have at least one jobId in timeEntries
    const hasJobEntries = validatedData.timeEntries.some((te: any) => te.jobId)
    const isAttendanceSubmission = !hasJobEntries
    const submissionType = isAttendanceSubmission ? 'ATTENDANCE' : 'TIME'
    
    console.log('POST /api/timesheet-submissions - Submission type determination:', {
      hasJobEntries,
      isAttendanceSubmission,
      submissionType,
      timeEntriesCount: validatedData.timeEntries.length
    })
    
    // Check if timesheet submission already exists for this week and type
    // IMPORTANT: Use composite unique constraint with type to allow separate ATTENDANCE and TIME submissions
    // Use findFirst instead of findUnique to work around Prisma client recognition issues
    // Use the corrected weekStart
    const existingSubmission = await prisma.timesheetSubmission.findFirst({
      where: {
        userId: validatedData.userId,
        weekStart: weekStart,
        type: submissionType
      }
    })
    
    console.log('POST /api/timesheet-submissions - Existing submission:', existingSubmission ? {
      id: existingSubmission.id,
      status: existingSubmission.status,
      userId: existingSubmission.userId,
      weekStart: existingSubmission.weekStart
    } : 'None found')

    // Allow re-submission of SUBMITTED timesheets
    // Only block if already APPROVED (which should be read-only)
    if (existingSubmission && existingSubmission.status === 'APPROVED') {
      return NextResponse.json(
        { error: 'Timesheet has already been approved and cannot be modified' },
        { status: 400 }
      )
    }

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      let submission
      
      if (existingSubmission) {
        // Update existing submission - clear rejection data when resubmitting
        console.log('POST /api/timesheet-submissions - Updating existing submission:', existingSubmission.id, 'from status:', existingSubmission.status, 'to SUBMITTED')
        submission = await tx.timesheetSubmission.update({
          where: { id: existingSubmission.id },
          data: {
            status: 'SUBMITTED',
            submittedAt: new Date(),
            weekStart: weekStart, // Update with corrected weekStart
            weekEnd: weekEnd, // Update with corrected weekEnd
            // Clear rejection data when resubmitting
            rejectedAt: null,
            rejectedById: null,
            rejectionReason: null,
            // Clear approval data as well since it's being resubmitted
            approvedAt: null,
            approvedById: null
          }
        })
        console.log('POST /api/timesheet-submissions - Updated submission result:', {
          id: submission.id,
          status: submission.status,
          submittedAt: submission.submittedAt
        })
      } else {
        // Create new submission with the determined type
        // IMPORTANT: Include type field to use composite unique constraint
        console.log('POST /api/timesheet-submissions - Creating new submission with type:', submissionType)
        submission = await tx.timesheetSubmission.create({
          data: {
            userId: validatedData.userId,
            weekStart: weekStart, // Use corrected weekStart
            weekEnd: weekEnd, // Use corrected weekEnd
            type: submissionType, // Include type field
            status: 'SUBMITTED',
            submittedAt: new Date()
          }
        })
        console.log('POST /api/timesheet-submissions - Created submission:', {
          id: submission.id,
          type: submission.type,
          status: submission.status
        })
      }

      // Note: Attendance entries are stored in Timesheet table
      // We query them by week range when fetching submissions
      // No need to link them here since we'll query by date range

      // Update or create time entries
      // Only create TimeEntry records if jobId is provided (for job entries)
      for (const entry of validatedData.timeEntries) {
        let resolvedJobId =
          typeof entry.jobId === 'string' && entry.jobId.trim() !== ''
            ? entry.jobId.trim()
            : null
        if (resolvedJobId) {
          const existing = await tx.job.findUnique({ where: { id: resolvedJobId } })
          if (!existing) resolvedJobId = null
        }
        const jobNumberHint = entry.jobNumber?.trim() || null
        if (!resolvedJobId && jobNumberHint) {
          const ensured = await ensureJobForTimeSubmission(
            tx,
            jobNumberHint,
            validatedData.userId
          )
          resolvedJobId = ensured.id
        }

        // Skip entries without a job (attendance entries) - they're tracked via Timesheet records
        if (!resolvedJobId) {
          continue
        }

        if (entry.id) {
          // Update existing entry
          await tx.timeEntry.update({
            where: { id: entry.id },
            data: {
              date: entry.date,
              regularHours: entry.regularHours,
              overtimeHours: entry.overtimeHours,
              notes: entry.notes,
              billable: entry.billable,
              rate: entry.rate,
              jobId: resolvedJobId,
              laborCodeId: entry.laborCodeId ?? null,
              submissionId: submission.id
            }
          })
        } else {
          // Create new entry
          await tx.timeEntry.create({
            data: {
              date: entry.date,
              regularHours: entry.regularHours,
              overtimeHours: entry.overtimeHours,
              notes: entry.notes,
              billable: entry.billable,
              rate: entry.rate,
              userId: validatedData.userId,
              jobId: resolvedJobId,
              laborCodeId: entry.laborCodeId ?? null,
              submissionId: submission.id
            }
          })
        }
      }
      
      // Note: Attendance entries (clock in/out) are stored in Timesheet table
      // The submission represents the week's attendance submission
      // We don't need to create TimeEntry records for attendance-only submissions

      return submission
    })

    // Fetch the complete submission with all relations for the response
    const completeSubmission = await prisma.timesheetSubmission.findUnique({
      where: { id: result.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    console.log('POST /api/timesheet-submissions - Returning submission:', {
      id: completeSubmission?.id,
      userId: completeSubmission?.userId,
      weekStart: completeSubmission?.weekStart,
      status: completeSubmission?.status
    })

    return NextResponse.json(
      {
        success: true,
        data: completeSubmission || result,
      },
      { status: 201 }
    )
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', JSON.stringify(error.errors, null, 2))
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      )
    }
    console.error('Error creating timesheet submission:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create timesheet submission',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Bypass authentication for testing
    // const session = await getServerSession(authOptions)
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')
    const weekStartParam = searchParams.get('weekStart')

    const where: any = {}
    if (userId) where.userId = userId
    if (status) where.status = status
    if (weekStartParam) {
      // Match exact week start date
      const weekStartDate = new Date(weekStartParam)
      // Normalize to start of day for comparison (UTC)
      const weekStartUTC = new Date(Date.UTC(
        weekStartDate.getUTCFullYear(),
        weekStartDate.getUTCMonth(),
        weekStartDate.getUTCDate(),
        0, 0, 0, 0
      ))
      const weekStartEndUTC = new Date(Date.UTC(
        weekStartDate.getUTCFullYear(),
        weekStartDate.getUTCMonth(),
        weekStartDate.getUTCDate(),
        23, 59, 59, 999
      ))
      where.weekStart = {
        gte: weekStartUTC,
        lte: weekStartEndUTC
      }
      console.log('[GET /api/timesheet-submissions] WeekStart filter:', {
        param: weekStartParam,
        weekStartUTC: weekStartUTC.toISOString(),
        weekStartEndUTC: weekStartEndUTC.toISOString()
      })
    }

    const submissions = await prisma.timesheetSubmission.findMany({
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
        timeEntries: {
          include: {
            job: {
              select: {
                id: true,
                jobNumber: true,
                title: true
              }
            },
            laborCode: {
              select: {
                id: true,
                code: true,
                description: true,
                hourlyRate: true
              }
            }
          }
        }
      },
      orderBy: { weekStart: 'desc' }
    })

    // For each submission, determine if it's attendance-only or job-only
    // Attendance entries are in Timesheet table (no job entries)
    // Job entries are in TimeEntry table (with jobId)
    const submissionsWithTimesheets = await Promise.all(
      submissions.map(async (submission) => {
        // Check if this submission has job entries (TimeEntry records with jobId)
        const hasJobEntries = submission.timeEntries && submission.timeEntries.length > 0 && 
                             submission.timeEntries.some((te: any) => te.jobId)
        
        // Only fetch timesheets for attendance-only submissions
        let timesheets: any[] = []
        let totalHours = 0
        
        if (!hasJobEntries) {
          // This is an attendance-only submission
          // Fetch Timesheet records for this week and user (no job entries)
          // Normalize dates to start/end of day for proper comparison
          const weekStartDate = new Date(submission.weekStart)
          weekStartDate.setHours(0, 0, 0, 0)
          const weekEndDate = new Date(submission.weekEnd)
          weekEndDate.setHours(23, 59, 59, 999)
          
          console.log(`[GET /api/timesheet-submissions] Fetching timesheets for attendance submission ${submission.id}:`, {
            userId: submission.userId,
            weekStart: submission.weekStart,
            weekEnd: submission.weekEnd,
            weekStartDate: weekStartDate.toISOString(),
            weekEndDate: weekEndDate.toISOString()
          })
          
          // Use a more reliable query that checks for timesheets with no job entries
          const allTimesheets = await prisma.timesheet.findMany({
            where: {
              userId: submission.userId,
              date: {
                gte: weekStartDate,
                lte: weekEndDate
              }
            },
            include: {
              jobEntries: true
            },
            orderBy: {
              date: 'asc'
            }
          })
          
          console.log(`[GET /api/timesheet-submissions] Found ${allTimesheets.length} total timesheets for week range`)
          
          // Filter to only include timesheets with no job entries (attendance-only)
          timesheets = allTimesheets.filter(ts => {
            const hasNoJobEntries = !ts.jobEntries || ts.jobEntries.length === 0
            if (!hasNoJobEntries) {
              console.log(`[GET /api/timesheet-submissions] Excluding timesheet ${ts.id} - has ${ts.jobEntries.length} job entries`)
            }
            return hasNoJobEntries
          })
          
          console.log(`[GET /api/timesheet-submissions] Attendance submission ${submission.id}: Found ${timesheets.length} attendance timesheets out of ${allTimesheets.length} total`)
          
          // Log timesheet dates for debugging
          if (timesheets.length > 0) {
            console.log(`[GET /api/timesheet-submissions] Timesheet dates:`, timesheets.map(ts => ({
              id: ts.id,
              date: ts.date,
              clockIn: ts.clockInTime,
              clockOut: ts.clockOutTime
            })))
          } else {
            console.log(`[GET /api/timesheet-submissions] WARNING: No attendance timesheets found for submission ${submission.id}`)
          }

          // Calculate total hours from timesheets
          totalHours = timesheets.reduce((sum, ts) => {
            if (ts.totalHours) return sum + ts.totalHours
            if (ts.clockOutTime) {
              const hours = (new Date(ts.clockOutTime).getTime() - new Date(ts.clockInTime).getTime()) / (1000 * 60 * 60)
              return sum + hours
            }
            return sum
          }, 0)
        } else {
          // This is a job-only submission
          // Calculate total hours from timeEntries
          totalHours = submission.timeEntries.reduce((sum: number, entry: any) => {
            return sum + (entry.regularHours || 0) + (entry.overtimeHours || 0)
          }, 0)
        }

        return {
          ...submission,
          timesheets, // Only populated for attendance-only submissions
          totalHours // Calculated total hours
        }
      })
    )

    // Convert Decimal fields to numbers for client compatibility
    const submissionsResponse = submissionsWithTimesheets.map(submission => ({
      ...submission,
      timeEntries: submission.timeEntries.map(entry => ({
        ...entry,
        rate: entry.rate ? Number(entry.rate) : null,
        laborCode: entry.laborCode ? {
          ...entry.laborCode,
          hourlyRate: Number(entry.laborCode.hourlyRate)
        } : null
      })),
      // Include timesheets and totalHours for attendance entries
      timesheets: submission.timesheets || [],
      totalHours: submission.totalHours || 0
    }))

    return NextResponse.json({
      success: true,
      data: submissionsResponse,
    })
  } catch (error: any) {
    console.error('Error fetching timesheet submissions:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch timesheet submissions',
      },
      { status: 500 }
    )
  }
}

