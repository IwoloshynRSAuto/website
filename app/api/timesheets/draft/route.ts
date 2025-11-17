import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const draftSchema = z.object({
  timesheetId: z.string().optional(),
  selectedJobId: z.string().optional(),
  selectedLaborCodeId: z.string().optional(),
  notes: z.string().optional(),
  activeJobEntryId: z.string().optional().nullable(),
})

// GET /api/timesheets/draft - Get draft data for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user exists
    let user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      }
    })

    if (!user && session.user.email) {
      user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        }
      })
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get the most recent in-progress timesheet for this user
    const timesheet = await prisma.timesheet.findFirst({
      where: {
        userId: user.id,
        status: 'in-progress'
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        jobEntries: {
          where: {
            punchOutTime: null
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      }
    })

    if (!timesheet) {
      return NextResponse.json({ draft: null })
    }

    // Return draft data based on current timesheet state
    const draft = {
      timesheetId: timesheet.id,
      clockInTime: timesheet.clockInTime.toISOString(),
      selectedJobId: null as string | null,
      selectedLaborCodeId: null as string | null,
      notes: null as string | null,
      activeJobEntryId: timesheet.jobEntries[0]?.id || null,
      lastSaved: timesheet.updatedAt.toISOString()
    }

    // If there's an active job entry, try to find matching job and labor code
    if (draft.activeJobEntryId) {
      const activeJob = timesheet.jobEntries[0]
      if (activeJob) {
        // Try to find job by jobNumber
        const job = await prisma.job.findFirst({
          where: { jobNumber: activeJob.jobNumber }
        })
        if (job) {
          draft.selectedJobId = job.id
        }

        // Try to find labor code by code
        const laborCode = await prisma.laborCode.findFirst({
          where: { code: activeJob.laborCode }
        })
        if (laborCode) {
          draft.selectedLaborCodeId = laborCode.id
        }

        if (activeJob.notes) {
          draft.notes = activeJob.notes
        }
      }
    }

    return NextResponse.json({ draft })
  } catch (error: any) {
    console.error('[API] Error loading draft:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}

// POST /api/timesheets/draft - Save draft data
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = draftSchema.parse(body)

    // Verify user exists
    let user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      }
    })

    if (!user && session.user.email) {
      user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        }
      })
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // If we have a timesheetId, update the timesheet's updatedAt to track activity
    if (validatedData.timesheetId) {
      await prisma.timesheet.update({
        where: { id: validatedData.timesheetId },
        data: {
          updatedAt: new Date() // Touch the timesheet to update its timestamp
        }
      })
    }

    // Draft data is stored implicitly in the timesheet and job entries
    // We just need to ensure the timesheet exists and is up-to-date
    return NextResponse.json({ 
      success: true,
      message: 'Draft saved'
    })
  } catch (error: any) {
    console.error('[API] Error saving draft:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: error.errors 
      }, { status: 400 })
    }
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}

// DELETE /api/timesheets/draft - Clear draft data
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user exists
    let user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      }
    })

    if (!user && session.user.email) {
      user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        }
      })
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Draft is cleared when timesheet is completed or deleted
    // This endpoint is mainly for explicit clearing
    return NextResponse.json({ 
      success: true,
      message: 'Draft cleared'
    })
  } catch (error: any) {
    console.error('[API] Error clearing draft:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}

