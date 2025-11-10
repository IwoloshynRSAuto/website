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
      include: { jobEntries: true }
    })

    if (!timesheet) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 })
    }

    // Only allow users to add jobs to their own timesheets (unless admin)
    if (timesheet.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Can't add jobs to completed timesheets
    if (timesheet.status === 'completed') {
      return NextResponse.json(
        { 
          error: 'Cannot add jobs to completed timesheet',
          details: 'This timesheet has been completed and cannot be modified. Please contact an administrator if you need to make changes.'
        },
        { status: 400 }
      )
    }

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

    // Check for duplicate labor code on same timesheet
    const duplicateLaborCode = timesheet.jobEntries.find(
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
    const activeJobs = timesheet.jobEntries.filter(job => !job.punchOutTime)
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

    // Create new job entry
    const jobEntry = await prisma.jobEntry.create({
      data: {
        timesheetId: timesheetId,
        jobNumber: validatedData.jobNumber,
        laborCode: validatedData.laborCode,
        punchInTime: roundedPunchIn,
        notes: validatedData.notes || null,
      }
    })

    return NextResponse.json(jobEntry, { status: 201 })
  } catch (error) {
    console.error('Error creating job entry:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

