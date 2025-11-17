import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { TimesheetService } from '@/lib/timekeeping/timesheet-service'
import { z } from 'zod'

const updateTimesheetStatusSchema = z.object({
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']),
  rejectionReason: z.string().optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Resolve params if it's a Promise (Next.js 15+)
    const resolvedParams = await Promise.resolve(params)
    const submissionId = resolvedParams.id

    const body = await request.json()
    const validatedData = updateTimesheetStatusSchema.parse(body)

    let updatedSubmission

    // Use TimesheetService for status changes
    if (validatedData.status === 'APPROVED') {
      updatedSubmission = await TimesheetService.approveSubmission(
        submissionId,
        session.user.id
      )
    } else if (validatedData.status === 'REJECTED') {
      if (!validatedData.rejectionReason) {
        return NextResponse.json(
          {
            success: false,
            error: 'Rejection reason is required',
          },
          { status: 400 }
        )
      }
      updatedSubmission = await TimesheetService.rejectSubmission(
        submissionId,
        session.user.id,
        validatedData.rejectionReason
      )
    } else if (validatedData.status === 'DRAFT') {
      updatedSubmission = await TimesheetService.reopenSubmission(submissionId)
    } else {
      // For SUBMITTED status, use direct update
      const { prisma } = await import('@/lib/prisma')
      updatedSubmission = await prisma.timesheetSubmission.update({
        where: { id: submissionId },
        data: { status: 'SUBMITTED', submittedAt: new Date() },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          timeEntries: {
            include: {
              job: {
                select: {
                  id: true,
                  jobNumber: true,
                  title: true,
                },
              },
              laborCode: {
                select: {
                  id: true,
                  code: true,
                  description: true,
                  hourlyRate: true,
                },
              },
            },
          },
        },
      })
    }

    // Convert Decimal fields to numbers for client compatibility
    const submissionResponse = {
      ...updatedSubmission,
      timeEntries: updatedSubmission.timeEntries.map((entry) => ({
        ...entry,
        rate: entry.rate ? Number(entry.rate) : null,
        laborCode: entry.laborCode
          ? {
              ...entry.laborCode,
              hourlyRate: Number(entry.laborCode.hourlyRate),
            }
          : null,
      })),
    }

    return NextResponse.json({
      success: true,
      data: submissionResponse,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating timesheet submission:', error)
    return NextResponse.json(
      { error: 'Failed to update timesheet submission' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = await Promise.resolve(params)
  const submissionId = resolvedParams.id
  try {
    // Bypass authentication for testing
    // const session = await getServerSession(authOptions)
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const submission = await prisma.timesheetSubmission.findUnique({
      where: { id: submissionId },
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
      }
    })

    if (!submission) {
      return NextResponse.json(
        { error: 'Timesheet submission not found' },
        { status: 404 }
      )
    }

    // Convert Decimal fields to numbers for client compatibility
    const submissionResponse = {
      ...submission,
      timeEntries: submission.timeEntries.map(entry => ({
        ...entry,
        rate: entry.rate ? Number(entry.rate) : null,
        laborCode: entry.laborCode ? {
          ...entry.laborCode,
          hourlyRate: Number(entry.laborCode.hourlyRate)
        } : null
      }))
    }

    return NextResponse.json(submissionResponse)
  } catch (error) {
    console.error('Error fetching timesheet submission:', error)
    return NextResponse.json(
      { error: 'Failed to fetch timesheet submission' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Bypass authentication for testing
    // const session = await getServerSession(authOptions)
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    // Check if submission exists
    const submission = await prisma.timesheetSubmission.findUnique({
      where: { id: submissionId }
    })

    if (!submission) {
      return NextResponse.json(
        { error: 'Timesheet submission not found' },
        { status: 404 }
      )
    }

    // Allow deletion of any status since we can now reopen approved timesheets

    // Use transaction to ensure data consistency
    await prisma.$transaction(async (tx) => {
      // Remove submission reference from time entries
      await tx.timeEntry.updateMany({
        where: { submissionId: submissionId },
        data: { submissionId: null }
      })

      // Delete the submission
      await tx.timesheetSubmission.delete({
        where: { id: submissionId }
      })
    })

    return NextResponse.json({ message: 'Timesheet submission deleted successfully' })
  } catch (error) {
    console.error('Error deleting timesheet submission:', error)
    return NextResponse.json(
      { error: 'Failed to delete timesheet submission' },
      { status: 500 }
    )
  }
}





