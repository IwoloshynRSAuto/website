import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { dateStringSchema, validateDateRangeQuery, validateDateRange } from '@/lib/utils/date-validation'
import { getAllowedPhaseCodesForUser } from '@/lib/timekeeping/phase-code-access'
import { buildTimeEntryCostSnapshot, formatTimeEntryDecimals } from '@/lib/timekeeping/time-entry-cost'

const createTimeEntrySchema = z.object({
  date: dateStringSchema,
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
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createTimeEntrySchema.parse(body)

    const isAdmin = session.user.role === 'ADMIN'
    const effectiveUserId = isAdmin ? validatedData.userId : session.user.id

    // Enforce labor code access (phase codes)
    if (validatedData.laborCodeId) {
      const allowed = await getAllowedPhaseCodesForUser(effectiveUserId)
      if (!allowed.some((c) => c.id === validatedData.laborCodeId)) {
        return NextResponse.json({ error: 'Forbidden phase code' }, { status: 403 })
      }
    }
    
    // Validate date range (not too far in past/future)
    try {
      validateDateRange(validatedData.date, 365, 30)
    } catch (error) {
      return NextResponse.json(
        { error: 'Validation error', details: error instanceof Error ? error.message : 'Invalid date range' },
        { status: 400 }
      )
    }

    let snapshot
    try {
      snapshot = await buildTimeEntryCostSnapshot(prisma, {
        regularHours: validatedData.regularHours,
        overtimeHours: validatedData.overtimeHours,
        laborCodeId: validatedData.laborCodeId ?? null,
        explicitRate: validatedData.rate ?? null,
      })
    } catch (costErr) {
      const msg = costErr instanceof Error ? costErr.message : 'Could not compute time entry cost'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    // Create the time entry
    const timeEntry = await prisma.timeEntry.create({
      data: {
        ...validatedData,
        userId: effectiveUserId,
        ...snapshot,
      },
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

    const timeEntryResponse = formatTimeEntryDecimals({
      ...timeEntry,
      laborCode: timeEntry.laborCode
        ? {
            ...timeEntry.laborCode,
            hourlyRate: timeEntry.laborCode.hourlyRate ? Number(timeEntry.laborCode.hourlyRate) : null,
          }
        : null,
    })

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
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updateData } = body
    
    if (!id) {
      return NextResponse.json({ error: 'Time entry ID is required' }, { status: 400 })
    }

    // Validate update data
    const validatedData = createTimeEntrySchema.partial().parse(updateData)

    const existing = await prisma.timeEntry.findUnique({
      where: { id },
      select: {
        userId: true,
        regularHours: true,
        overtimeHours: true,
        laborCodeId: true,
        rate: true,
      },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const isAdmin = session.user.role === 'ADMIN'
    if (!isAdmin && existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const effectiveUserId = isAdmin ? (validatedData.userId ?? existing.userId) : existing.userId ?? session.user.id
    if (validatedData.laborCodeId) {
      const allowed = await getAllowedPhaseCodesForUser(effectiveUserId)
      if (!allowed.some((c) => c.id === validatedData.laborCodeId)) {
        return NextResponse.json({ error: 'Forbidden phase code' }, { status: 403 })
      }
    }
    
    // Validate date range if date is being updated
    if (validatedData.date) {
      try {
        validateDateRange(validatedData.date, 365, 30)
      } catch (error) {
        return NextResponse.json(
          { error: 'Validation error', details: error instanceof Error ? error.message : 'Invalid date range' },
          { status: 400 }
        )
      }
    }

    const mergedRegular = validatedData.regularHours ?? existing.regularHours
    const mergedOt = validatedData.overtimeHours ?? existing.overtimeHours
    const mergedLaborCodeId =
      validatedData.laborCodeId !== undefined ? validatedData.laborCodeId : existing.laborCodeId
    const explicitRate =
      validatedData.rate !== undefined
        ? validatedData.rate
        : existing.rate != null
          ? Number(existing.rate)
          : null

    let snapshot
    try {
      snapshot = await buildTimeEntryCostSnapshot(prisma, {
        regularHours: mergedRegular,
        overtimeHours: mergedOt,
        laborCodeId: mergedLaborCodeId,
        explicitRate,
      })
    } catch (costErr) {
      const msg = costErr instanceof Error ? costErr.message : 'Could not compute time entry cost'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    // Update the time entry
    const timeEntry = await prisma.timeEntry.update({
      where: { id },
      data: {
        ...validatedData,
        ...snapshot,
      },
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

    const timeEntryResponse = formatTimeEntryDecimals({
      ...timeEntry,
      laborCode: timeEntry.laborCode
        ? {
            ...timeEntry.laborCode,
            hourlyRate: timeEntry.laborCode.hourlyRate ? Number(timeEntry.laborCode.hourlyRate) : null,
          }
        : null,
    })

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
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const jobId = searchParams.get('jobId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build where clause
    const where: any = {}
    const isAdmin = session.user.role === 'ADMIN'
    if (userId) {
      if (!isAdmin && userId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      where.userId = userId
    } else if (!isAdmin) {
      where.userId = session.user.id
    }
    if (jobId) where.jobId = jobId
    if (startDate || endDate) {
      try {
        const { start, end } = validateDateRangeQuery(startDate, endDate)
        if (start && end) {
          where.date = {
            gte: start,
            lte: end
          }
        }
      } catch (error) {
        return NextResponse.json(
          { error: 'Validation error', details: error instanceof Error ? error.message : 'Invalid date range query' },
          { status: 400 }
        )
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

    const timeEntriesResponse = timeEntries.map((entry) =>
      formatTimeEntryDecimals({
        ...entry,
        laborCode: entry.laborCode
          ? {
              ...entry.laborCode,
              hourlyRate: entry.laborCode.hourlyRate ? Number(entry.laborCode.hourlyRate) : null,
            }
          : null,
      })
    )

    return NextResponse.json(timeEntriesResponse)
  } catch (error) {
    console.error('Error fetching time entries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch time entries' },
      { status: 500 }
    )
  }
}
