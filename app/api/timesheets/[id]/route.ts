import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { roundToNearest15Minutes, calculateHoursBetween } from '@/lib/utils/time-rounding'
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
  clockOutTime: z.string().transform((val) => new Date(val)).optional().nullable(),
  status: z.enum(['in-progress', 'completed', 'needs-review']).optional(),
})

// PATCH /api/timesheets/:id - Update timesheet
export async function PATCH(
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
      include: { jobEntries: true }
    })

    if (!timesheet) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 })
    }

    // Verify user exists and get database user ID
    let user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    // If not found by ID, try by email (for old sessions)
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

    // Only allow users to update their own timesheets (unless admin)
    if (timesheet.userId !== user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = updateTimesheetSchema.parse(body)

    const updateData: any = {}

    // Round times if provided
    if (validatedData.clockInTime) {
      updateData.clockInTime = roundToNearest15Minutes(validatedData.clockInTime)
    }

    if (validatedData.clockOutTime !== undefined) {
      if (validatedData.clockOutTime) {
        updateData.clockOutTime = roundToNearest15Minutes(validatedData.clockOutTime)
      } else {
        updateData.clockOutTime = null
      }
    }

    if (validatedData.status) {
      updateData.status = validatedData.status
    }

    // Calculate total hours if both times are present
    const clockIn = updateData.clockInTime || timesheet.clockInTime
    const clockOut = updateData.clockOutTime !== undefined ? updateData.clockOutTime : timesheet.clockOutTime

    if (clockOut) {
      // Validate that clock out is after clock in
      if (clockOut < clockIn) {
        return NextResponse.json(
          { error: 'Clock out time must be after clock in time' },
          { status: 400 }
        )
      }
      updateData.totalHours = calculateHoursBetween(clockIn, clockOut)
    } else if (validatedData.clockOutTime === null && timesheet.clockOutTime) {
      // If explicitly setting clockOutTime to null, clear total hours
      updateData.totalHours = null
    }

    // If clocking out, auto-close all open job entries
    if (validatedData.clockOutTime && !timesheet.clockOutTime) {
      const openJobs = timesheet.jobEntries.filter(job => !job.punchOutTime)
      if (openJobs.length > 0) {
        await prisma.jobEntry.updateMany({
          where: {
            id: { in: openJobs.map(j => j.id) },
            punchOutTime: null
          },
          data: {
            punchOutTime: roundToNearest15Minutes(validatedData.clockOutTime)
          }
        })
      }
    }

    const updated = await prisma.timesheet.update({
      where: { id: timesheetId },
      data: updateData,
      include: {
        jobEntries: {
          orderBy: {
            punchInTime: 'asc'
          }
        }
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating timesheet:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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

    // Verify user exists and get database user ID
    let user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    // If not found by ID, try by email (for old sessions)
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

    // Only allow users to delete their own timesheets (unless admin)
    if (timesheet.userId !== user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete the timesheet (cascade will delete job entries)
    await prisma.timesheet.delete({
      where: { id: timesheetId }
    })

    return NextResponse.json({ success: true, message: 'Timesheet deleted successfully' })
  } catch (error) {
    console.error('Error deleting timesheet:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

