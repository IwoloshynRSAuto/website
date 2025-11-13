import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { startOfWeek, endOfWeek } from 'date-fns'

const createTimesheetSubmissionSchema = z.object({
  userId: z.string().min(1, 'User is required'),
  weekStart: z.string().transform((val) => new Date(val)),
  weekEnd: z.string().transform((val) => new Date(val)),
  timeEntries: z.array(z.object({
    id: z.string().optional(),
    timesheetId: z.string().optional(), // For attendance entries
    date: z.string().transform((val) => new Date(val)),
    clockInTime: z.preprocess(
      (val) => val === null || val === undefined ? undefined : val,
      z.string().transform((val) => new Date(val)).optional()
    ),
    clockOutTime: z.preprocess(
      (val) => val === null || val === undefined ? undefined : val,
      z.string().transform((val) => new Date(val)).optional().nullable()
    ),
    regularHours: z.number().min(0).default(0),
    overtimeHours: z.number().min(0).default(0),
    notes: z.string().nullable().optional(),
    billable: z.boolean().default(true),
    rate: z.number().nullable().optional(),
    jobId: z.string().optional(), // Make optional for attendance entries
    laborCodeId: z.string().optional()
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
    let user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user && session.user.email) {
      user = await prisma.user.findUnique({
        where: { email: session.user.email }
      })
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
    // Convert both to strings for comparison to handle any type mismatches
    const validatedUserIdStr = String(validatedData.userId)
    const dbUserIdStr = String(user.id)
    
    if (validatedUserIdStr !== dbUserIdStr && session.user.role !== 'ADMIN') {
      console.error('POST /api/timesheet-submissions - Permission denied:', {
        validatedUserId: validatedUserIdStr,
        dbUserId: dbUserIdStr,
        sessionUserRole: session.user.role
      })
      return NextResponse.json(
        { error: 'Forbidden: You can only submit your own timesheets' },
        { status: 403 }
      )
    }

    // Check if timesheet submission already exists for this week
    const existingSubmission = await prisma.timesheetSubmission.findUnique({
      where: {
        userId_weekStart: {
          userId: validatedData.userId,
          weekStart: validatedData.weekStart
        }
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
            weekEnd: validatedData.weekEnd,
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
        // Create new submission
        submission = await tx.timesheetSubmission.create({
          data: {
            userId: validatedData.userId,
            weekStart: validatedData.weekStart,
            weekEnd: validatedData.weekEnd,
            status: 'SUBMITTED',
            submittedAt: new Date()
          }
        })
      }

      // Note: Attendance entries are stored in Timesheet table
      // We query them by week range when fetching submissions
      // No need to link them here since we'll query by date range

      // Update or create time entries
      // Only create TimeEntry records if jobId is provided (for job entries)
      for (const entry of validatedData.timeEntries) {
        // Skip entries without jobId (attendance entries) - they're tracked via Timesheet records
        if (!entry.jobId) {
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
              jobId: entry.jobId,
              laborCodeId: entry.laborCodeId,
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
              jobId: entry.jobId,
              laborCodeId: entry.laborCodeId,
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

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', JSON.stringify(error.errors, null, 2))
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating timesheet submission:', error)
    return NextResponse.json(
      { error: 'Failed to create timesheet submission', message: error instanceof Error ? error.message : String(error) },
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
    const weekStart = searchParams.get('weekStart')

    const where: any = {}
    if (userId) where.userId = userId
    if (status) where.status = status
    if (weekStart) where.weekStart = new Date(weekStart)

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

    // For each submission, fetch Timesheet records for attendance entries
    // Attendance entries are in Timesheet table, not TimeEntry
    const submissionsWithTimesheets = await Promise.all(
      submissions.map(async (submission) => {
        // Fetch Timesheet records for this week and user
        const timesheets = await prisma.timesheet.findMany({
          where: {
            userId: submission.userId,
            date: {
              gte: submission.weekStart,
              lte: submission.weekEnd
            },
            jobEntries: {
              none: {} // No job entries = attendance only
            }
          },
          orderBy: {
            date: 'asc'
          }
        })

        // Calculate total hours from timesheets
        const totalHours = timesheets.reduce((sum, ts) => {
          if (ts.totalHours) return sum + ts.totalHours
          if (ts.clockOutTime) {
            const hours = (new Date(ts.clockOutTime).getTime() - new Date(ts.clockInTime).getTime()) / (1000 * 60 * 60)
            return sum + hours
          }
          return sum
        }, 0)

        return {
          ...submission,
          timesheets, // Add timesheets to submission
          totalHours // Add calculated total hours
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

    return NextResponse.json(submissionsResponse)
  } catch (error) {
    console.error('Error fetching timesheet submissions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch timesheet submissions' },
      { status: 500 }
    )
  }
}

