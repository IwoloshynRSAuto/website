import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { roundToNearest15Minutes, getDateOnly, calculateHoursBetween } from '@/lib/utils/time-rounding'
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

const createTimesheetSchema = z.object({
  clockInTime: z.string().transform((val) => new Date(val)),
  clockOutTime: z.string().transform((val) => new Date(val)).optional().nullable(),
  date: z.string().optional().transform((val) => {
    if (!val) return new Date()
    // If it's already in YYYY-MM-DD format, parse it as local date
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const [year, month, day] = val.split('-').map(Number)
      return new Date(year, month - 1, day, 12, 0, 0, 0) // Use noon to avoid timezone issues
    }
    // Otherwise parse as ISO string
    return new Date(val)
  }),
})

const updateTimesheetSchema = z.object({
  clockInTime: z.string().transform((val) => new Date(val)).optional(),
  clockOutTime: z.string().transform((val) => new Date(val)).optional().nullable(),
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
    const validatedData = createTimesheetSchema.parse(body)

    // Round clock-in time to nearest 15 minutes
    const roundedClockIn = roundToNearest15Minutes(validatedData.clockInTime)
    
    // Round clock-out time if provided
    let roundedClockOut: Date | null = null
    if (validatedData.clockOutTime) {
      roundedClockOut = roundToNearest15Minutes(validatedData.clockOutTime)
    }
    
    // Get date-only (YYYY-MM-DD) - use local date components to avoid timezone issues
    const dateInput = validatedData.date || new Date()
    const dateYear = dateInput.getFullYear()
    const dateMonth = dateInput.getMonth()
    const dateDay = dateInput.getDate()
    const dateOnly = `${dateYear}-${String(dateMonth + 1).padStart(2, '0')}-${String(dateDay).padStart(2, '0')}`

    // Allow multiple timesheets per day - each clock in creates a new entry

    // Verify user exists in database - try by ID first, then by email
    let user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    // If not found by ID, try by email (in case ID is email from old sessions)
    if (!user && session.user.email) {
      user = await prisma.user.findUnique({
        where: { email: session.user.email }
      })
      
      // If found by email, log a warning
      if (user) {
        console.warn(`[API] User found by email instead of ID. Session ID: ${session.user.id}, DB ID: ${user.id}`)
      }
    }

    if (!user) {
      console.error(`[API] User not found. Session ID: ${session.user.id}, Email: ${session.user.email}`)
      return NextResponse.json(
        { 
          error: 'User not found. Please sign out and sign in again to refresh your session.',
          details: `Session user ID: ${session.user.id}, Email: ${session.user.email || 'N/A'}`
        },
        { status: 404 }
      )
    }

    // Create timesheet - use the database user ID (not session ID which might be email)
    // Parse dateOnly as local date to avoid timezone issues
    const [yearNum, monthNum, dayNum] = dateOnly.split('-').map(Number)
    const dateForDb = new Date(yearNum, monthNum - 1, dayNum, 12, 0, 0, 0) // Use noon to avoid timezone edge cases
    
    // Check for overlapping entries on the same date
    const startOfDay = new Date(yearNum, monthNum - 1, dayNum, 0, 0, 0, 0)
    const endOfDay = new Date(yearNum, monthNum - 1, dayNum, 23, 59, 59, 999)
    
    const existingEntries = await prisma.timesheet.findMany({
      where: {
        userId: user.id,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    })
    
    // Check for overlaps
    const newIn = roundedClockIn
    const newOut = roundedClockOut || new Date(yearNum, monthNum - 1, dayNum, 23, 59, 59, 999)
    
    const hasOverlap = existingEntries.some(entry => {
      const existingIn = new Date(entry.clockInTime)
      const existingOut = entry.clockOutTime ? new Date(entry.clockOutTime) : new Date(yearNum, monthNum - 1, dayNum, 23, 59, 59, 999)
      
      // Overlap occurs if: newIn < existingOut && newOut > existingIn
      return newIn < existingOut && newOut > existingIn
    })
    
    if (hasOverlap) {
      return NextResponse.json(
        { 
          error: 'This time entry overlaps with an existing entry. Please adjust the time range.',
          details: 'Time entries cannot overlap on the same date.'
        },
        { status: 400 }
      )
    }
    
    // Determine status based on whether clock out time is provided
    const status = roundedClockOut ? 'completed' : 'in-progress'
    
    const timesheet = await prisma.timesheet.create({
      data: {
        userId: user.id, // Use the database user ID we just found
        date: dateForDb,
        clockInTime: roundedClockIn,
        clockOutTime: roundedClockOut,
        status: status,
      },
      include: {
        jobEntries: true,
      }
    })

    console.log('[API] Timesheet created successfully:', timesheet.id)
    return NextResponse.json(timesheet, { status: 201 })
  } catch (error: any) {
    console.error('[API] Error creating timesheet:', error)
    console.error('[API] Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    })
    
    if (error instanceof z.ZodError) {
      console.error('[API] Zod validation errors:', error.errors)
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      }, { status: 400 })
    }
    
    // Handle Prisma errors
    if (error.code === 'P2003') {
      return NextResponse.json({ 
        error: 'Database constraint error',
        details: 'The user ID does not exist in the database. Please sign in again.'
      }, { status: 400 })
    }
    
    // P2002 (unique constraint violation) - we allow multiple timesheets per day
    // This should not happen if the unique index was properly removed
    if (error.code === 'P2002') {
      console.error('[API] Unique constraint violation - this should not happen!')
      console.error('[API] Error meta:', error.meta)
      console.error('[API] This indicates the database still has a unique constraint/index')
      // Log the error but don't block - try to continue
      return NextResponse.json({ 
        error: 'Database constraint error',
        details: `Unique constraint violation: ${error.meta?.target?.join(', ') || 'unknown'}. The database may still have a unique constraint that needs to be removed.`
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message || 'An unexpected error occurred'
    }, { status: 500 })
  }
}

// GET /api/timesheets?userId=... - List timesheets
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || session.user.id
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Only allow users to view their own timesheets (unless admin)
    if (userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const whereClause: any = {
      userId: userId,
    }

    // Add date range filtering if provided
    if (startDate || endDate) {
      whereClause.date = {}
      if (startDate) {
        whereClause.date.gte = new Date(startDate)
      }
      if (endDate) {
        whereClause.date.lte = new Date(endDate)
      }
    }

    const timesheets = await prisma.timesheet.findMany({
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

    // Check submission status for each timesheet's week
    const timesheetsWithStatus = await Promise.all(
      timesheets.map(async (timesheet) => {
        const timesheetDate = new Date(timesheet.date)
        const weekStart = startOfWeek(timesheetDate, { weekStartsOn: 0 })
        
        // Check if there's a submission for this week
        const submission = await prisma.timesheetSubmission.findUnique({
          where: {
            userId_weekStart: {
              userId: timesheet.userId,
              weekStart: weekStart
            }
          },
          select: {
            id: true,
            status: true,
            rejectedAt: true,
            rejectionReason: true
          }
        })

        return {
          ...timesheet,
          submissionStatus: submission?.status || 'DRAFT',
          submissionId: submission?.id || null,
          isLocked: submission?.status === 'SUBMITTED' || submission?.status === 'APPROVED',
          isRejected: submission?.status === 'REJECTED',
          rejectionReason: submission?.rejectionReason || null
        }
      })
    )

    return NextResponse.json(timesheetsWithStatus)
  } catch (error) {
    console.error('Error fetching timesheets:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

