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

const updateJobEntrySchema = z.object({
  punchInTime: z.string().transform((val) => new Date(val)).optional(),
  punchOutTime: z.string().transform((val) => new Date(val)).optional().nullable(),
  notes: z.string().optional().nullable(),
})

// PATCH /api/jobs/:id - Update job entry
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
    const jobEntryId = resolvedParams.id

    if (!jobEntryId) {
      return NextResponse.json({ error: 'Job entry ID is required' }, { status: 400 })
    }

    const jobEntry = await prisma.jobEntry.findUnique({
      where: { id: jobEntryId },
      include: {
        timesheet: true
      }
    })

    if (!jobEntry) {
      return NextResponse.json({ error: 'Job entry not found' }, { status: 404 })
    }

    // Only allow users to update jobs in their own timesheets (unless admin)
    if (jobEntry.timesheet.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Rate limiting
    if (!checkRateLimit(session.user.id)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment before trying again.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const validatedData = updateJobEntrySchema.parse(body)

    const updateData: any = {}

    // Round times if provided
    if (validatedData.punchInTime) {
      updateData.punchInTime = roundToNearest15Minutes(validatedData.punchInTime)
    }

    if (validatedData.punchOutTime !== undefined) {
      if (validatedData.punchOutTime) {
        updateData.punchOutTime = roundToNearest15Minutes(validatedData.punchOutTime)
      } else {
        updateData.punchOutTime = null
      }
    }

    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes
    }

    // Validate punch out is after punch in
    const finalPunchIn = updateData.punchInTime || jobEntry.punchInTime
    const finalPunchOut = updateData.punchOutTime !== undefined ? updateData.punchOutTime : jobEntry.punchOutTime

    if (finalPunchOut && finalPunchIn) {
      if (finalPunchOut < finalPunchIn) {
        return NextResponse.json(
          { error: 'Punch out time must be after punch in time' },
          { status: 400 }
        )
      }
    }

    // Validate punch in is before punch out (if both provided)
    if (updateData.punchInTime && jobEntry.punchOutTime) {
      if (updateData.punchInTime > jobEntry.punchOutTime) {
        return NextResponse.json(
          { error: 'Punch in time must be before punch out time' },
          { status: 400 }
        )
      }
    }

    const updated = await prisma.jobEntry.update({
      where: { id: jobEntryId },
      data: updateData,
      include: {
        timesheet: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        }
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating job entry:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/jobs/:id - Delete job entry
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
    const jobEntryId = resolvedParams.id

    if (!jobEntryId) {
      return NextResponse.json({ error: 'Job entry ID is required' }, { status: 400 })
    }

    const jobEntry = await prisma.jobEntry.findUnique({
      where: { id: jobEntryId },
      include: {
        timesheet: true
      }
    })

    if (!jobEntry) {
      return NextResponse.json({ error: 'Job entry not found' }, { status: 404 })
    }

    // Only allow users to delete jobs in their own timesheets (unless admin)
    if (jobEntry.timesheet.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete the job entry
    await prisma.jobEntry.delete({
      where: { id: jobEntryId }
    })

    return NextResponse.json({ success: true, message: 'Job entry deleted successfully' })
  } catch (error) {
    console.error('Error deleting job entry:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
