import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams
    const { searchParams } = new URL(request.url)
    const laborCodeId = searchParams.get('laborCodeId')

    const whereClause: any = {
      jobId: id,
    }

    if (laborCodeId) {
      whereClause.laborCodeId = laborCodeId
    }

    const timeEntries = await prisma.timeEntry.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        laborCode: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        submission: {
          select: {
            id: true,
            status: true,
            submittedAt: true,
            approvedAt: true,
          },
        },
      },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    const serializedEntries = timeEntries.map(entry => ({
      ...entry,
      date: entry.date.toISOString(),
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      regularHours: Number(entry.regularHours),
      overtimeHours: Number(entry.overtimeHours),
      rate: entry.rate ? Number(entry.rate) : null,
    }))

    return NextResponse.json({
      success: true,
      timeEntries: serializedEntries,
    })
  } catch (error: any) {
    console.error('[Time Entries] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch time entries',
      },
      { status: 500 }
    )
  }
}


