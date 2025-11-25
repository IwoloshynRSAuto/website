import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/tasks?quote_id={id} or ?job_id={id}
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const quoteId = searchParams.get('quote_id')
    const jobId = searchParams.get('job_id')

    if (!quoteId && !jobId) {
      return NextResponse.json({ error: 'quote_id or job_id is required' }, { status: 400 })
    }

    const where: any = {}
    if (quoteId) where.quoteId = quoteId
    if (jobId) where.jobId = jobId

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: tasks })
  } catch (error: any) {
    console.error('[GET /api/tasks] Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch tasks' }, { status: 500 })
  }
}

// POST /api/tasks
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { quote_id, job_id, title, description, assigned_to, status } = body

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    if (!quote_id && !job_id) {
      return NextResponse.json({ error: 'quote_id or job_id is required' }, { status: 400 })
    }

    const task = await prisma.task.create({
      data: {
        quoteId: quote_id || null,
        jobId: job_id || null,
        title,
        description: description || null,
        assignedTo: assigned_to || null,
        status: status || 'TO_DO',
      },
    })

    return NextResponse.json({ success: true, data: task })
  } catch (error: any) {
    console.error('[POST /api/tasks] Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create task' }, { status: 500 })
  }
}


