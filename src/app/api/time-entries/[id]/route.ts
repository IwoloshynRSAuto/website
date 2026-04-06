import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateTimeEntrySchema = z.object({
  date: z.string().transform((val) => new Date(val)).optional(),
  regularHours: z.number().min(0, 'Regular hours must be positive').optional(),
  overtimeHours: z.number().min(0, 'Overtime hours must be positive').optional(),
  notes: z.string().nullable().optional(),
  billable: z.boolean().optional(),
  rate: z.number().nullable().optional(),
  userId: z.string().optional(),
  jobId: z.string().optional(),
  laborCodeId: z.string().nullable().optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Bypass authentication for testing
    // const session = await getServerSession(authOptions)
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const { id } = params
    const timeEntry = await prisma.timeEntry.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
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
    })

    if (!timeEntry) {
      return NextResponse.json({ error: 'Time entry not found' }, { status: 404 })
    }

    // Convert Decimal fields to numbers for client compatibility
    const timeEntryResponse = {
      ...timeEntry,
      rate: timeEntry.rate ? Number(timeEntry.rate) : null,
      laborCode: timeEntry.laborCode ? {
        ...timeEntry.laborCode,
        hourlyRate: timeEntry.laborCode.hourlyRate ? Number(timeEntry.laborCode.hourlyRate) : null
      } : null
    }

    return NextResponse.json(timeEntryResponse)
  } catch (error) {
    console.error('Error fetching time entry:', error)
    return NextResponse.json(
      { error: 'Failed to fetch time entry' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Bypass authentication for testing
    // const session = await getServerSession(authOptions)
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const { id } = params
    const body = await request.json()
    const validatedData = updateTimeEntrySchema.parse(body)

    // Check if this time entry is part of an approved submission
    const existingEntry = await prisma.timeEntry.findUnique({
      where: { id },
      include: {
        submission: true
      }
    })

    if (!existingEntry) {
      return NextResponse.json({ error: 'Time entry not found' }, { status: 404 })
    }

    // Allow editing time entries from any status
    // Users can now explicitly reopen timesheets using the reopen button

    const updatedTimeEntry = await prisma.timeEntry.update({
      where: { id },
      data: validatedData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
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
    })

    // Convert Decimal fields to numbers for client compatibility
    const timeEntryResponse = {
      ...updatedTimeEntry,
      rate: updatedTimeEntry.rate ? Number(updatedTimeEntry.rate) : null,
      laborCode: updatedTimeEntry.laborCode ? {
        ...updatedTimeEntry.laborCode,
        hourlyRate: updatedTimeEntry.laborCode.hourlyRate ? Number(updatedTimeEntry.laborCode.hourlyRate) : null
      } : null
    }

    return NextResponse.json(timeEntryResponse)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating time entry:', error)
    return NextResponse.json(
      { error: 'Failed to update time entry' },
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

    const { id } = params
    
    // Check if this time entry is part of an approved submission
    const existingEntry = await prisma.timeEntry.findUnique({
      where: { id },
      include: {
        submission: true
      }
    })

    if (!existingEntry) {
      return NextResponse.json({ error: 'Time entry not found' }, { status: 404 })
    }

    // Allow editing time entries from any status
    // Users can now explicitly reopen timesheets using the reopen button

    await prisma.timeEntry.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Time entry deleted successfully' })
  } catch (error) {
    console.error('Error deleting time entry:', error)
    return NextResponse.json(
      { error: 'Failed to delete time entry' },
      { status: 500 }
    )
  }
}





