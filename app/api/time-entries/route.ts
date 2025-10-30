import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createTimeEntrySchema = z.object({
  date: z.string().transform((val) => new Date(val)),
  regularHours: z.number().min(0, 'Regular hours must be positive').default(0),
  overtimeHours: z.number().min(0, 'Overtime hours must be positive').default(0),
  notes: z.string().nullable().optional(),
  billable: z.boolean().default(true),
  rate: z.number().nullable().optional(),
  userId: z.string().min(1, 'User is required'),
  jobId: z.string().min(1, 'Job is required'),
  laborCodeId: z.string().nullable().optional()
})

export async function POST(request: NextRequest) {
  try {
    // Bypass authentication for testing
    // const session = await getServerSession(authOptions)
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json()
    const validatedData = createTimeEntrySchema.parse(body)

    // Create the time entry
    const timeEntry = await prisma.timeEntry.create({
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
      ...timeEntry,
      rate: timeEntry.rate ? Number(timeEntry.rate) : null,
      laborCode: timeEntry.laborCode ? {
        ...timeEntry.laborCode,
        hourlyRate: timeEntry.laborCode.hourlyRate ? Number(timeEntry.laborCode.hourlyRate) : null
      } : null
    }

    return NextResponse.json(timeEntryResponse, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error details:', error.errors)
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating time entry:', error)
    return NextResponse.json(
      { error: 'Failed to create time entry', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Bypass authentication for testing
    // const session = await getServerSession(authOptions)
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json()
    const { id, ...updateData } = body
    
    if (!id) {
      return NextResponse.json({ error: 'Time entry ID is required' }, { status: 400 })
    }

    // Validate update data
    const validatedData = createTimeEntrySchema.partial().parse(updateData)
    
    // Transform date if provided
    if (validatedData.date) {
      validatedData.date = new Date(validatedData.date)
    }

    // Update the time entry
    const timeEntry = await prisma.timeEntry.update({
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
      ...timeEntry,
      rate: timeEntry.rate ? Number(timeEntry.rate) : null,
      laborCode: timeEntry.laborCode ? {
        ...timeEntry.laborCode,
        hourlyRate: timeEntry.laborCode.hourlyRate ? Number(timeEntry.laborCode.hourlyRate) : null
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

export async function GET(request: NextRequest) {
  try {
    // Bypass authentication for testing
    // const session = await getServerSession(authOptions)
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const jobId = searchParams.get('jobId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build where clause
    const where: any = {}
    if (userId) where.userId = userId
    if (jobId) where.jobId = jobId
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    const timeEntries = await prisma.timeEntry.findMany({
      where,
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
      },
      orderBy: { date: 'desc' }
    })

    // Convert Decimal fields to numbers for client compatibility
    const timeEntriesResponse = timeEntries.map(entry => ({
      ...entry,
      rate: entry.rate ? Number(entry.rate) : null,
      laborCode: entry.laborCode ? {
        ...entry.laborCode,
        hourlyRate: entry.laborCode.hourlyRate ? Number(entry.laborCode.hourlyRate) : null
      } : null
    }))

    return NextResponse.json(timeEntriesResponse)
  } catch (error) {
    console.error('Error fetching time entries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch time entries' },
      { status: 500 }
    )
  }
}
