import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle params - could be a Promise in Next.js 15+
    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        assignedTo: true,
        createdBy: true,
        customer: true,
        timeEntries: {
          include: {
            user: true,
            laborCode: true
          }
        },
        _count: {
          select: {
            timeEntries: true
          }
        }
      }
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Convert Decimal fields to numbers
    const jobResponse = {
      ...job,
      estimatedHours: job.estimatedHours ? Number(job.estimatedHours) : null,
      actualHours: job.actualHours ? Number(job.actualHours) : null,
      estimatedCost: job.estimatedCost ? Number(job.estimatedCost) : null,
      dueTodayPercent: job.dueTodayPercent ? Number(job.dueTodayPercent) : null,
    }

    return NextResponse.json(jobResponse)
  } catch (error: any) {
    console.error('Error fetching job:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle params - could be a Promise in Next.js 15+
    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams
    const body = await request.json()
    const { 
      status, 
      title, 
      description, 
      priority, 
      startDate, 
      endDate, 
      estimatedHours, 
      actualHours, 
      assignedToId,
      // New fields
      customerId,
      workCode,
      estimatedCost,
      dueTodayPercent,
      inQuickBooks,
      inLDrive,
      fileLink,
      lastFollowUp
    } = body

    // Validate status if provided
    if (status) {
      const allowedStatuses = ['QUOTE', 'ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED', 'PLANNING', 'PENDING', 'APPROVED', 'REJECTED', 'DRAFT']
      if (!allowedStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Build update data object
    const updateData: any = {}
    if (status) updateData.status = status
    if (title) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (priority) updateData.priority = priority
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null
    if (estimatedHours !== undefined) updateData.estimatedHours = estimatedHours
    if (actualHours !== undefined) updateData.actualHours = actualHours
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId
    // New fields
    if (customerId !== undefined) updateData.customerId = customerId
    if (workCode !== undefined) updateData.workCode = workCode
    if (estimatedCost !== undefined) updateData.estimatedCost = estimatedCost
    if (dueTodayPercent !== undefined) updateData.dueTodayPercent = dueTodayPercent
    if (inQuickBooks !== undefined) updateData.inQuickBooks = inQuickBooks
    if (inLDrive !== undefined) updateData.inLDrive = inLDrive
    if (fileLink !== undefined) updateData.fileLink = fileLink === '' || fileLink === null ? null : fileLink
    if (lastFollowUp !== undefined) updateData.lastFollowUp = lastFollowUp ? new Date(lastFollowUp) : null

    // Update the job
    const updatedJob = await prisma.job.update({
      where: { id },
      data: updateData,
      include: {
        assignedTo: true,
        createdBy: true,
        customer: true,
        _count: {
          select: {
            timeEntries: true
          }
        }
      }
    })

    // Convert Decimal fields to numbers
    const jobResponse = {
      ...updatedJob,
      estimatedHours: updatedJob.estimatedHours ? Number(updatedJob.estimatedHours) : null,
      actualHours: updatedJob.actualHours ? Number(updatedJob.actualHours) : null,
      estimatedCost: updatedJob.estimatedCost ? Number(updatedJob.estimatedCost) : null,
      dueTodayPercent: updatedJob.dueTodayPercent ? Number(updatedJob.dueTodayPercent) : null,
    }

    return NextResponse.json(jobResponse)
  } catch (error: any) {
    console.error('Error updating job:', error)
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack
    })
    return NextResponse.json(
      { 
        error: 'Failed to update job',
        details: error?.message || 'Unknown error',
        code: error?.code
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle params - could be a Promise in Next.js 15+
    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams

    // Check if job exists
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            timeEntries: true
          }
        }
      }
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Delete all related records first (cascade delete)
    // Delete time entries associated with this job
    await prisma.timeEntry.deleteMany({
      where: { jobId: id }
    })

    // Delete the job
    await prisma.job.delete({
      where: { id }
    })

    return NextResponse.json({ 
      message: 'Job deleted successfully',
      deletedTimeEntries: job._count.timeEntries
    })
  } catch (error: any) {
    console.error('Error deleting job:', error)
    return NextResponse.json(
      { error: 'Failed to delete job', details: error.message },
      { status: 500 }
    )
  }
}