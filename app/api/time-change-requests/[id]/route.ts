import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { roundToNearest15Minutes, calculateHoursBetween } from '@/lib/utils/time-rounding'

const updateChangeRequestSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  rejectionReason: z.string().optional()
})

// PUT /api/time-change-requests/[id] - Approve or reject a change request
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can approve/reject change requests
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Only admins can approve change requests' }, { status: 403 })
    }

    const resolvedParams = await Promise.resolve(params)
    const changeRequestId = resolvedParams.id

    const body = await request.json()
    const validatedData = updateChangeRequestSchema.parse(body)

    // Get the change request
    const changeRequest = await prisma.timeChangeRequest.findUnique({
      where: { id: changeRequestId },
      include: {
        timesheet: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!changeRequest) {
      return NextResponse.json({ error: 'Change request not found' }, { status: 404 })
    }

    if (changeRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Change request has already been ${changeRequest.status.toLowerCase()}` },
        { status: 400 }
      )
    }

    // Verify admin user exists
    let adminUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!adminUser && session.user.email) {
      adminUser = await prisma.user.findUnique({
        where: { email: session.user.email }
      })
    }

    if (!adminUser) {
      return NextResponse.json(
        { error: 'Admin user not found. Please sign in again.' },
        { status: 404 }
      )
    }

    // Update change request status
    const updateData: any = {
      status: validatedData.status
    }

    if (validatedData.status === 'APPROVED') {
      updateData.approvedAt = new Date()
      updateData.approvedById = adminUser.id
    } else if (validatedData.status === 'REJECTED') {
      updateData.rejectedAt = new Date()
      updateData.rejectedById = adminUser.id
      if (validatedData.rejectionReason) {
        updateData.rejectionReason = validatedData.rejectionReason
      }
    }

    // Use transaction to update change request and apply changes if approved
    const result = await prisma.$transaction(async (tx) => {
      // Update the change request
      const updatedRequest = await tx.timeChangeRequest.update({
        where: { id: changeRequestId },
        data: updateData
      })

      // If approved, apply the change to the timesheet
      if (validatedData.status === 'APPROVED') {
        const clockOut = changeRequest.requestedClockOutTime
        const totalHours = clockOut
          ? calculateHoursBetween(changeRequest.requestedClockInTime, clockOut)
          : null

        // Round the requested times
        const roundedClockIn = roundToNearest15Minutes(changeRequest.requestedClockInTime)
        const roundedClockOut = clockOut ? roundToNearest15Minutes(clockOut) : null

        // Check for overlaps before applying the change
        const changeDate = new Date(changeRequest.date)
        const year = changeDate.getFullYear()
        const month = changeDate.getMonth()
        const day = changeDate.getDate()
        const startOfDay = new Date(year, month, day, 0, 0, 0, 0)
        const endOfDay = new Date(year, month, day, 23, 59, 59, 999)

        // Get all existing timesheets for this user and date (excluding the one being updated if it exists)
        const existingEntries = await tx.timesheet.findMany({
          where: {
            userId: changeRequest.userId,
            date: {
              gte: startOfDay,
              lte: endOfDay
            },
            id: changeRequest.timesheetId ? { not: changeRequest.timesheetId } : undefined
          },
          include: {
            jobEntries: true
          }
        })

        // Check if the requested times would overlap with existing entries
        const newIn = roundedClockIn
        const newOut = roundedClockOut || new Date(year, month, day, 23, 59, 59, 999)

        // Check if this is a job-only timesheet (midnight clock-in, no clock-out)
        const clockInLocal = new Date(roundedClockIn.getFullYear(), roundedClockIn.getMonth(), roundedClockIn.getDate(),
                                      roundedClockIn.getHours(), roundedClockIn.getMinutes(), roundedClockIn.getSeconds())
        const isJobOnlyTimesheet = clockInLocal.getHours() === 0 && 
                                    clockInLocal.getMinutes() === 0 && 
                                    !roundedClockOut

        if (!isJobOnlyTimesheet) {
          // Check for overlaps with existing attendance entries
          const hasOverlap = existingEntries.some(entry => {
            // Skip job-only timesheets
            const entryIn = new Date(entry.clockInTime)
            const entryInLocal = new Date(entryIn.getFullYear(), entryIn.getMonth(), entryIn.getDate(), 
                                          entryIn.getHours(), entryIn.getMinutes(), entryIn.getSeconds())
            const isEntryJobOnly = entryInLocal.getHours() === 0 && 
                                   entryInLocal.getMinutes() === 0 && 
                                   !entry.clockOutTime

            if (isEntryJobOnly) {
              return false // Job-only timesheets don't count as overlaps
            }

            const existingIn = entryIn
            const existingOut = entry.clockOutTime ? new Date(entry.clockOutTime) : new Date(year, month, day, 23, 59, 59, 999)

            // Overlap occurs if: newIn < existingOut && newOut > existingIn
            return newIn < existingOut && newOut > existingIn
          })

          if (hasOverlap) {
            return NextResponse.json(
              {
                success: false,
                error: 'Cannot approve: This time change would create an overlapping entry. Please reject this request and ask the user to adjust the times.',
                details: 'Time entries cannot overlap on the same date.',
              },
              { status: 400 }
            )
          }
        }

        if (changeRequest.timesheetId) {
          // Update existing timesheet
          const timesheet = await tx.timesheet.findUnique({
            where: { id: changeRequest.timesheetId }
          })

          if (timesheet) {
            await tx.timesheet.update({
              where: { id: changeRequest.timesheetId },
              data: {
                clockInTime: roundedClockIn,
                clockOutTime: roundedClockOut,
                totalHours: totalHours,
                status: clockOut ? 'completed' : 'in-progress'
              }
            })
          }
        } else {
          // If no timesheet exists, create one with the requested times
          await tx.timesheet.create({
            data: {
              userId: changeRequest.userId,
              date: changeRequest.date,
              clockInTime: roundedClockIn,
              clockOutTime: roundedClockOut,
              totalHours: totalHours,
              status: clockOut ? 'completed' : 'in-progress'
            }
          })
        }
      }

      return updatedRequest
    })

    return NextResponse.json({
      success: true,
      message: `Change request ${validatedData.status.toLowerCase()} successfully`,
      changeRequest: result
    })
  } catch (error) {
    console.error('Error updating change request:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/time-change-requests/[id] - Get a specific change request
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    const changeRequestId = resolvedParams.id

    const changeRequest = await prisma.timeChangeRequest.findUnique({
      where: { id: changeRequestId },
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
        timesheet: true
      }
    })

    if (!changeRequest) {
      return NextResponse.json({ error: 'Change request not found' }, { status: 404 })
    }

    // Users can only view their own change requests (unless admin)
    if (changeRequest.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(changeRequest)
  } catch (error) {
    console.error('Error fetching change request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

