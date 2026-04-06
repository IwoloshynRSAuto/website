import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { roundToNearest15Minutes } from '@/lib/utils/time-rounding'
import { JobService } from '@/lib/jobs/service'
import { updateJobSchema } from '@/lib/jobs/schemas'
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

// PATCH /api/jobs/:id - Update job (project) or timesheet job entry
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
    const id = resolvedParams.id

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    // Job (project) first — same disambiguation as DELETE
    const job = await prisma.job.findUnique({
      where: { id },
    })

    if (job) {
      if (job.createdById !== session.user.id && session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const body = await request.json()
      const validatedData = updateJobSchema.parse(body)

      const updated = await JobService.updateJob(id, validatedData, session.user.id)
      return NextResponse.json(updated)
    }

    const jobEntry = await prisma.jobEntry.findUnique({
      where: { id },
      include: {
        timesheet: true
      }
    })

    if (!jobEntry) {
      return NextResponse.json({ error: 'Job or job entry not found' }, { status: 404 })
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
      where: { id },
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

// DELETE /api/jobs/:id - Delete job (project) or job entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.error('[DELETE /api/jobs/[id]] Unauthorized request')
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Handle Next.js 15 async params
    const resolvedParams = await Promise.resolve(params)
    const id = resolvedParams.id

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 })
    }

    console.log('[DELETE /api/jobs/[id]] Attempting to delete:', id)

    // First, try to find it as a Job (project)
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            timeEntries: true,
            milestones: true,
            deliverables: true,
            expenseReports: true,
            serviceReports: true,
            purchaseOrders: true,
            billingMilestones: true,
          }
        }
      }
    })

    if (job) {
      // This is a Job (project) deletion
      // Check authorization - only admins or job creator can delete
      if (job.createdById !== session.user.id && session.user.role !== 'ADMIN') {
        console.warn('[DELETE /api/jobs/[id]] Forbidden - user is not creator or admin')
        return NextResponse.json({ 
          success: false, 
          error: 'You do not have permission to delete this job' 
        }, { status: 403 })
      }

      // Count related records for response
      const deletedTimeEntries = job._count.timeEntries

      console.log('[DELETE /api/jobs/[id]] Deleting job with related data:', {
        jobId: id,
        jobNumber: job.jobNumber,
        timeEntries: job._count.timeEntries,
        milestones: job._count.milestones,
        deliverables: job._count.deliverables,
      })

      // Delete the job - cascading deletes will handle related records
      // (milestones, deliverables, etc. have onDelete: Cascade)
      // Time entries have onDelete: Restrict, so we need to handle them
      
      // Delete time entries first (they have onDelete: Restrict)
      if (job._count.timeEntries > 0) {
        await prisma.timeEntry.deleteMany({
          where: { jobId: id }
        })
      }

      // Delete the job (cascading will handle milestones, deliverables, etc.)
      await prisma.job.delete({
        where: { id }
      })

      console.log('[DELETE /api/jobs/[id]] Job deleted successfully:', id)

      return NextResponse.json({ 
        success: true, 
        message: 'Job deleted successfully',
        deletedTimeEntries 
      })
    }

    // If not a Job, try JobEntry (timesheet entry)
    const jobEntry = await prisma.jobEntry.findUnique({
      where: { id },
      include: {
        timesheet: true
      }
    })

    if (jobEntry) {
      // Only allow users to delete jobs in their own timesheets (unless admin)
      if (jobEntry.timesheet.userId !== session.user.id && session.user.role !== 'ADMIN') {
        console.warn('[DELETE /api/jobs/[id]] Forbidden - user cannot delete this job entry')
        return NextResponse.json({ 
          success: false, 
          error: 'Forbidden' 
        }, { status: 403 })
      }

      // Delete the job entry
      await prisma.jobEntry.delete({
        where: { id }
      })

      console.log('[DELETE /api/jobs/[id]] Job entry deleted successfully:', id)

      return NextResponse.json({ 
        success: true, 
        message: 'Job entry deleted successfully' 
      })
    }

    // Not found
    console.warn('[DELETE /api/jobs/[id]] Not found:', id)
    return NextResponse.json({ 
      success: false, 
      error: 'Job or job entry not found' 
    }, { status: 404 })
  } catch (error: any) {
    console.error('[DELETE /api/jobs/[id]] Error deleting:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      name: error.name,
    })
    
    // Handle foreign key constraint errors
    if (error.code === 'P2003') {
      return NextResponse.json({ 
        success: false, 
        error: 'Cannot delete job because it has related records that cannot be automatically removed' 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    }, { status: 500 })
  }
}
