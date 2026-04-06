import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const laborCodeId = searchParams.get('laborCodeId')

    if (!laborCodeId) {
      return NextResponse.json({ error: 'Labor code ID is required' }, { status: 400 })
    }

    // Fetch the job to get job number and details
    const job = await prisma.job.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        jobNumber: true,
        title: true
      }
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Fetch the labor code details
    const laborCode = await prisma.laborCode.findUnique({
      where: { id: laborCodeId },
      select: {
        id: true,
        code: true,
        name: true,
        category: true,
        hourlyRate: true
      }
    })

    if (!laborCode) {
      return NextResponse.json({ error: 'Labor code not found' }, { status: 404 })
    }

    // Fetch all time entries for this job and labor code
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        jobId: params.id,
        laborCodeId: laborCodeId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    })

    // Calculate totals
    const totalRegularHours = timeEntries.reduce((sum, entry) => sum + entry.regularHours, 0)
    const totalOvertimeHours = timeEntries.reduce((sum, entry) => sum + entry.overtimeHours, 0)
    const totalHours = totalRegularHours + totalOvertimeHours
    const totalCost = totalHours * Number(laborCode.hourlyRate)

    // Format the response
    const breakdown = timeEntries.map(entry => ({
      id: entry.id,
      employeeName: entry.user?.name || 'Unknown',
      employeeEmail: entry.user?.email || '',
      regularHours: entry.regularHours,
      overtimeHours: entry.overtimeHours,
      totalHours: entry.regularHours + entry.overtimeHours,
      date: entry.date,
      notes: entry.notes,
      billable: entry.billable
    }))

    return NextResponse.json({
      job: {
        id: job.id,
        jobNumber: job.jobNumber,
        title: job.title
      },
      laborCode: {
        id: laborCode.id,
        code: laborCode.code,
        name: laborCode.name,
        category: laborCode.category,
        hourlyRate: Number(laborCode.hourlyRate)
      },
      summary: {
        totalRegularHours,
        totalOvertimeHours,
        totalHours,
        totalCost,
        entryCount: timeEntries.length
      },
      breakdown
    })
  } catch (error) {
    console.error('Error fetching labor code breakdown:', error)
    return NextResponse.json(
      { error: 'Failed to fetch labor code breakdown' },
      { status: 500 }
    )
  }
}

