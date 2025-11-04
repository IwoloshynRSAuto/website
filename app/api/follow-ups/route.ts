import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const followUpSchema = z.object({
  type: z.enum(['quote', 'job']),
  id: z.string(),
})

// GET all items needing follow-up (quotes and jobs where lastFollowUp is null or >7 days old - weekly follow-ups)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Weekly follow-up (7 days) for quotes and active jobs
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // Get quotes needing follow-up (QUOTE status quotes and active quotes)
    const quotesNeedingFollowUp = await prisma.quote.findMany({
      where: {
        isActive: true,
        status: {
          in: ['QUOTE', 'DRAFT'], // Quote status and draft quotes need follow-up
        },
        OR: [
          { lastFollowUp: null },
          { lastFollowUp: { lt: sevenDaysAgo } },
        ],
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: {
        lastFollowUp: 'asc', // nulls first
      },
    })

    // Get jobs needing follow-up (ACTIVE status jobs)
    const jobsNeedingFollowUp = await prisma.job.findMany({
      where: {
        status: 'ACTIVE', // Only active jobs need follow-up
        OR: [
          { lastFollowUp: null },
          { lastFollowUp: { lt: sevenDaysAgo } },
        ],
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: {
        lastFollowUp: 'asc', // nulls first
      },
    })

    return NextResponse.json({
      quotes: quotesNeedingFollowUp,
      jobs: jobsNeedingFollowUp,
      total: quotesNeedingFollowUp.length + jobsNeedingFollowUp.length,
    })
  } catch (error) {
    console.error('Error fetching follow-ups:', error)
    return NextResponse.json(
      { error: 'Failed to fetch follow-ups' },
      { status: 500 }
    )
  }
}

// POST mark follow-up as completed
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = followUpSchema.parse(body)

    if (validated.type === 'quote') {
      const quote = await prisma.quote.update({
        where: { id: validated.id },
        data: { lastFollowUp: new Date() },
      })
      return NextResponse.json({ quote })
    } else if (validated.type === 'job') {
      const job = await prisma.job.update({
        where: { id: validated.id },
        data: { lastFollowUp: new Date() },
      })
      return NextResponse.json({ job })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error marking follow-up:', error)
    return NextResponse.json(
      { error: 'Failed to mark follow-up' },
      { status: 500 }
    )
  }
}

