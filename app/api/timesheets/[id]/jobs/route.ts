import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { roundToNearest15Minutes } from '@/lib/utils/time-rounding'
import { z } from 'zod'

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10

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

const createJobEntrySchema = z.object({
  jobNumber: z.string().min(1, 'Job number is required'),
  laborCode: z.string().min(1, 'Labor code is required'),
  punchInTime: z.string().transform((val) => new Date(val)),
  punchOutTime: z.string().transform((val) => new Date(val)).optional().nullable(),
  notes: z.string().optional().nullable(),
})

// POST /api/timesheets/:id/jobs - Add job entry
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Handle Next.js 15 async params
    const resolvedParams = await Promise.resolve(params)
    const timesheetId = resolvedParams.id

    if (!timesheetId) {
      return NextResponse.json({ error: 'Timesheet ID is required' }, { status: 400 })
    }

    const timesheet = await prisma.timesheet.findUnique({
      where: { id: timesheetId },
      include: { 
        jobEntries: true,
        // Check if this timesheet is part of a submission
      }
    })
    
    if (!timesheet) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 })
    }
    
    // Check if timesheet is part of a submitted week - MUST match the timesheet's userId
    // IMPORTANT: Only check for JOB-ONLY submissions, not attendance-only submissions
    const timesheetDate = new Date(timesheet.date)
    const weekStart = new Date(timesheetDate)
    weekStart.setDate(timesheetDate.getDate() - timesheetDate.getDay()) // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0)
    
    // Normalize weekStart to UTC start of day for comparison (matches database storage)
    const weekStartUTC = new Date(Date.UTC(
      weekStart.getUTCFullYear(),
      weekStart.getUTCMonth(),
      weekStart.getUTCDate(),
      0, 0, 0, 0
    ))
    
    // Try to find the submission for this week using findFirst
    // IMPORTANT: Only check for TIME type submissions when adding job entries
    // This allows ATTENDANCE submissions to exist independently for the same week
    // Use findFirst instead of findUnique to work around Prisma client recognition issues
    let submission = await prisma.timesheetSubmission.findFirst({
      where: {
        userId: timesheet.userId, // Use timesheet's userId, not session user
        weekStart: weekStartUTC,
        type: 'TIME' // Only check TIME submissions for job entries
      },
      include: {
        timeEntries: {
          select: {
            jobId: true
          }
        }
      }
    })
    
    // If not found with findUnique, try findMany as fallback (in case weekStart doesn't match exactly)
    // IMPORTANT: Still filter by type='TIME' to only get job-related submissions
    if (!submission) {
      const submissions = await prisma.timesheetSubmission.findMany({
        where: {
          userId: timesheet.userId,
          type: 'TIME', // Only check TIME submissions for job entries
          weekStart: {
            gte: new Date(weekStartUTC.getTime() - 24 * 60 * 60 * 1000), // Day before
            lt: new Date(weekStartUTC.getTime() + 24 * 60 * 60 * 1000) // Day after
          }
        },
        include: {
          timeEntries: {
            select: {
              jobId: true
            }
          }
        }
      })
      submission = submissions[0] || null
    }
    
    // Check if this is a job-only submission (has timeEntries with jobId)
    // IMPORTANT: Only consider it locked if it's a JOB-ONLY submission
    // Attendance-only submissions should NOT block job entries
    let jobOnlySubmission = null
    if (submission && (submission.status === 'SUBMITTED' || submission.status === 'APPROVED')) {
      const hasJobEntries = submission.timeEntries && submission.timeEntries.length > 0 && 
                           submission.timeEntries.some((te: any) => te.jobId !== null && te.jobId !== undefined)
      
      console.log('[POST /api/timesheets/:id/jobs] Submission check:', {
        submissionId: submission.id,
        status: submission.status,
        timeEntriesCount: submission.timeEntries?.length || 0,
        hasJobEntries,
        willBlock: hasJobEntries // Only block if it's a job-only submission
      })
      
      // Only consider it a blocking submission if it's job-only
      if (hasJobEntries) {
        jobOnlySubmission = submission
      } else {
        console.log('[POST /api/timesheets/:id/jobs] Submission is attendance-only, NOT blocking job entries')
      }
    }
    
    // Add submission status to timesheet object
    // Only consider it locked if there's a JOB-ONLY submission
    const timesheetWithStatus = {
      ...timesheet,
      submissionStatus: jobOnlySubmission?.status || 'DRAFT',
      submissionId: jobOnlySubmission?.id || null,
      isLocked: !!jobOnlySubmission // Only locked if there's a job-only submission
    }
    
    console.log('[POST /api/timesheets/:id/jobs] Timesheet status:', {
      timesheetId: timesheet.id,
      userId: timesheet.userId,
      weekStart: weekStartUTC.toISOString(),
      hasSubmission: !!submission,
      submissionStatus: submission?.status,
      isJobOnlySubmission: !!jobOnlySubmission,
      isLocked: timesheetWithStatus.isLocked
    })

    // Only allow users to add jobs to their own timesheets (unless admin)
    if (timesheetWithStatus.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if this is a job-only timesheet (midnight entry, no clock-out, or has job entries)
    const hasJobEntries = timesheetWithStatus.jobEntries && Array.isArray(timesheetWithStatus.jobEntries) && timesheetWithStatus.jobEntries.length > 0
    const clockIn = timesheetWithStatus.clockInTime ? new Date(timesheetWithStatus.clockInTime) : null
    const isMidnightEntry = clockIn && 
                           clockIn.getHours() === 0 && 
                           clockIn.getMinutes() === 0
    const hasNoClockOut = !timesheetWithStatus.clockOutTime
    const isJobOnlyTimesheet = (isMidnightEntry && hasNoClockOut) || hasJobEntries
    
    // IMPORTANT: Only block if there's a JOB-ONLY submission (not attendance-only)
    // Job entries are completely independent from attendance submissions
    if (timesheetWithStatus.isLocked) {
      // Only block if this is actually a job-only submission
      // If isLocked is true, it means there's a job-only submission, so block it
      return NextResponse.json(
        { 
          error: 'Cannot add jobs to submitted timesheet',
          details: 'This timesheet has been submitted for approval and cannot be modified. Please wait for approval or rejection before making changes.'
        },
        { status: 400 }
      )
    }
    
    // Block if trying to add job entry to an attendance timesheet (has clock-out and is not job-only)
    // Job entries should only go on job-only timesheets
    if (timesheetWithStatus.clockOutTime && !isJobOnlyTimesheet) {
      return NextResponse.json(
        { 
          error: 'Cannot add jobs to completed attendance entry',
          details: 'This attendance entry has been completed. Job entries should be added to a separate timesheet entry. Please create a new entry for job time tracking.'
        },
        { status: 400 }
      )
    }
    
    // If it's a job-only timesheet, allow job entries regardless of status (unless locked)
    // This is the normal case - job entries go on job-only timesheets

    // Rate limiting
    if (!checkRateLimit(session.user.id)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment before trying again.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const validatedData = createJobEntrySchema.parse(body)

    // Round punch-in time
    const roundedPunchIn = roundToNearest15Minutes(validatedData.punchInTime)
    
    // Round punch-out time if provided
    let roundedPunchOut: Date | null = null
    if (validatedData.punchOutTime) {
      roundedPunchOut = roundToNearest15Minutes(validatedData.punchOutTime)
      
      // Validate punch out is after punch in
      if (roundedPunchOut < roundedPunchIn) {
        return NextResponse.json(
          { error: 'Punch out time must be after punch in time' },
          { status: 400 }
        )
      }
    }

    // Check for overlapping job entries on the same date
    // Get all job entries for this user on this date (across all timesheets)
    const jobEntryDate = new Date(timesheet.date)
    const year = jobEntryDate.getFullYear()
    const month = jobEntryDate.getMonth()
    const day = jobEntryDate.getDate()
    const startOfDay = new Date(year, month, day, 0, 0, 0, 0)
    const endOfDay = new Date(year, month, day, 23, 59, 59, 999)
    
    // Get all timesheets for this user on this date to check all job entries
    const allTimesheetsForDate = await prisma.timesheet.findMany({
      where: {
        userId: timesheet.userId,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
        jobEntries: true
      }
    })
    
    // Collect all job entries from all timesheets for this date
    const allJobEntries = allTimesheetsForDate.flatMap(ts => ts.jobEntries || [])
    
    console.log('[POST /api/timesheets/:id/jobs] Overlap check:', {
      timesheetId: timesheet.id,
      date: jobEntryDate.toISOString(),
      timesheetsFound: allTimesheetsForDate.length,
      jobEntriesFound: allJobEntries.length,
      newPunchIn: roundedPunchIn.toISOString(),
      newPunchOut: roundedPunchOut?.toISOString() || 'null',
      existingEntries: allJobEntries.map(e => ({
        id: e.id,
        timesheetId: e.timesheetId,
        punchIn: e.punchInTime,
        punchOut: e.punchOutTime,
        jobNumber: e.jobNumber
      }))
    })
    
    // Check for overlaps with existing job entries
    const newPunchIn = roundedPunchIn
    const newPunchOut = roundedPunchOut || new Date(year, month, day, 23, 59, 59, 999)
    
    const hasOverlap = allJobEntries.some(existingEntry => {
      const existingIn = new Date(existingEntry.punchInTime)
      const existingOut = existingEntry.punchOutTime 
        ? new Date(existingEntry.punchOutTime) 
        : new Date(year, month, day, 23, 59, 59, 999)
      
      // Overlap occurs if: newIn < existingOut && newOut > existingIn
      const overlaps = newPunchIn < existingOut && newPunchOut > existingIn
      
      if (overlaps) {
        console.log('[POST /api/timesheets/:id/jobs] Overlap found:', {
          newIn: newPunchIn.toISOString(),
          newOut: newPunchOut.toISOString(),
          existingIn: existingIn.toISOString(),
          existingOut: existingOut.toISOString(),
          existingEntryId: existingEntry.id,
          existingJobNumber: existingEntry.jobNumber
        })
      }
      
      return overlaps
    })
    
    if (hasOverlap) {
      console.error('[API] Job entry overlap detected:', {
        newPunchIn: newPunchIn.toISOString(),
        newPunchOut: newPunchOut.toISOString(),
        existingEntries: allJobEntries.map(e => ({
          id: e.id,
          timesheetId: e.timesheetId,
          punchIn: e.punchInTime,
          punchOut: e.punchOutTime,
          jobNumber: e.jobNumber
        }))
      })
      return NextResponse.json(
        {
          success: false,
          error: 'This time entry overlaps with an existing job entry. Please adjust the time range.',
          details: `Job time entries cannot overlap on the same date. Found ${allJobEntries.length} existing job entries for this date.`,
        },
        { status: 400 }
      )
    }

    // Only check for duplicate labor code if punch out time is not provided (active job)
    if (!roundedPunchOut) {
      const duplicateLaborCode = timesheetWithStatus.jobEntries.find(
        job => job.laborCode === validatedData.laborCode && !job.punchOutTime
      )

      if (duplicateLaborCode) {
        return NextResponse.json(
          { 
            error: 'This labor code is already active on this timesheet',
            details: `Labor code "${validatedData.laborCode}" is already being tracked. Please clock out of the existing job entry before starting a new one with the same labor code.`,
            existingJobEntryId: duplicateLaborCode.id
          },
          { status: 400 }
        )
      }

      // Auto-clock out any active job entries when starting a new job
      const activeJobs = timesheetWithStatus.jobEntries.filter(job => !job.punchOutTime)
      if (activeJobs.length > 0) {
        await prisma.jobEntry.updateMany({
          where: {
            id: { in: activeJobs.map(j => j.id) },
            punchOutTime: null
          },
          data: {
            punchOutTime: roundedPunchIn // Clock out at the same time as new job starts
          }
        })
      }
    }

    // Create new job entry
    const jobEntry = await prisma.jobEntry.create({
      data: {
        timesheetId: timesheetId,
        jobNumber: validatedData.jobNumber,
        laborCode: validatedData.laborCode,
        punchInTime: roundedPunchIn,
        punchOutTime: roundedPunchOut,
        notes: validatedData.notes || null,
      }
    })

    return NextResponse.json({ success: true, data: jobEntry }, { status: 201 })
  } catch (error: any) {
    console.error('[API] Error creating job entry:', error)
    console.error('[API] Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    })
    if (error instanceof z.ZodError) {
      console.error('[API] Zod validation errors:', JSON.stringify(error.errors, null, 2))
      return NextResponse.json({ 
        success: false,
        error: 'Invalid request data', 
        details: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        validationErrors: error.errors 
      }, { status: 400 })
    }
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Internal server error',
      details: error.message || 'An unexpected error occurred'
    }, { status: 500 })
  }
}

