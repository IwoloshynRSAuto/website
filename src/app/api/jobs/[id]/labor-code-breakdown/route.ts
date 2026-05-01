import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeTimeEntryCostsPlain } from '@/lib/timekeeping/time-entry-cost'
import { getOtMultiplier } from '@/lib/settings/system-settings'

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

    const otMultFallback = await getOtMultiplier(prisma)
    const phaseRate = Number(laborCode.hourlyRate)

    // Calculate totals
    const totalRegularHours = timeEntries.reduce((sum, entry) => sum + entry.regularHours, 0)
    const totalOvertimeHours = timeEntries.reduce((sum, entry) => sum + entry.overtimeHours, 0)
    const totalHours = totalRegularHours + totalOvertimeHours

    let totalRegularCost = 0
    let totalOtCost = 0
    const totalCost = timeEntries.reduce((sum, entry) => {
      if (entry.totalCost != null) {
        const rc = entry.regularCost != null ? Number(entry.regularCost) : 0
        const oc = entry.otCost != null ? Number(entry.otCost) : 0
        totalRegularCost += rc
        totalOtCost += oc
        return sum + Number(entry.totalCost)
      }
      const base = entry.rate != null ? Number(entry.rate) : phaseRate
      const mult = entry.otMultiplierUsed != null ? Number(entry.otMultiplierUsed) : otMultFallback
      const snap = computeTimeEntryCostsPlain({
        regularHours: entry.regularHours,
        overtimeHours: entry.overtimeHours,
        baseRate: base,
        otMultiplier: mult,
      })
      totalRegularCost += snap.regularCost
      totalOtCost += snap.otCost
      return sum + snap.totalCost
    }, 0)

    // Format the response
    const breakdown = timeEntries.map((entry) => {
      let regularCost: number | null = entry.regularCost != null ? Number(entry.regularCost) : null
      let otCost: number | null = entry.otCost != null ? Number(entry.otCost) : null
      let rowTotal: number | null = entry.totalCost != null ? Number(entry.totalCost) : null
      if (rowTotal == null || regularCost == null || otCost == null) {
        const base = entry.rate != null ? Number(entry.rate) : phaseRate
        const mult = entry.otMultiplierUsed != null ? Number(entry.otMultiplierUsed) : otMultFallback
        const snap = computeTimeEntryCostsPlain({
          regularHours: entry.regularHours,
          overtimeHours: entry.overtimeHours,
          baseRate: base,
          otMultiplier: mult,
        })
        regularCost = snap.regularCost
        otCost = snap.otCost
        rowTotal = snap.totalCost
      }
      return {
        id: entry.id,
        employeeName: entry.user?.name || 'Unknown',
        employeeEmail: entry.user?.email || '',
        regularHours: entry.regularHours,
        overtimeHours: entry.overtimeHours,
        totalHours: entry.regularHours + entry.overtimeHours,
        regularCost,
        otCost,
        totalCost: rowTotal,
        date: entry.date,
        notes: entry.notes,
        billable: entry.billable,
      }
    })

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
        totalRegularCost,
        totalOtCost,
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

