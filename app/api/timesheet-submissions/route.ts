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
    date: z.string().transform((val) => new Date(val)),
    regularHours: z.number().min(0).default(0),
    overtimeHours: z.number().min(0).default(0),
    notes: z.string().optional(),
    billable: z.boolean().default(true),
    rate: z.number().optional(),
    jobId: z.string().min(1, 'Job is required'),
    laborCodeId: z.string().optional()
  }))
})

const updateTimesheetStatusSchema = z.object({
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']),
  rejectionReason: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    // Bypass authentication for testing
    // const session = await getServerSession(authOptions)
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json()
    console.log('POST /api/timesheet-submissions - Request body:', JSON.stringify(body, null, 2))
    const validatedData = createTimesheetSubmissionSchema.parse(body)

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

      // Update or create time entries
      for (const entry of validatedData.timeEntries) {
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

      return submission
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating timesheet submission:', error)
    return NextResponse.json(
      { error: 'Failed to create timesheet submission' },
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

    // Convert Decimal fields to numbers for client compatibility
    const submissionsResponse = submissions.map(submission => ({
      ...submission,
      timeEntries: submission.timeEntries.map(entry => ({
        ...entry,
        rate: entry.rate ? Number(entry.rate) : null,
        laborCode: entry.laborCode ? {
          ...entry.laborCode,
          hourlyRate: Number(entry.laborCode.hourlyRate)
        } : null
      }))
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

