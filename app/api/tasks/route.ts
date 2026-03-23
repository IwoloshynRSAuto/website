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

    const tasks = await prisma.taskCard.findMany({
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
  let body: any = {}
  
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 })
    }

    try {
      body = await request.json()
    } catch (parseError: any) {
      console.error('[POST /api/tasks] Failed to parse request body:', parseError)
      return NextResponse.json({ 
        success: false,
        error: 'Invalid request body. Expected JSON.' 
      }, { status: 400 })
    }
    
    // Extract only the fields we expect - ignore any extra fields
    // Make sure we're getting primitive values, not objects
    const quote_id = typeof body.quote_id === 'string' ? body.quote_id : null
    const job_id = typeof body.job_id === 'string' ? body.job_id : null
    const title = typeof body.title === 'string' ? body.title : (typeof body.name === 'string' ? body.name : null)
    const description = typeof body.description === 'string' ? body.description : null
    const assigned_to = typeof body.assigned_to === 'string' ? body.assigned_to : (typeof body.assignedToId === 'string' ? body.assignedToId : null)
    const taskCode = typeof body.taskCode === 'string' ? body.taskCode : null
    const taskCodeDescription = typeof body.taskCodeDescription === 'string' ? body.taskCodeDescription : null
    const dueDate = body.dueDate ? (typeof body.dueDate === 'string' ? body.dueDate : null) : null

    if (!title || title.trim() === '') {
      return NextResponse.json({ 
        success: false,
        error: 'title is required' 
      }, { status: 400 })
    }

    // SIMPLIFIED APPROACH: Always use BACKLOG for new tasks
    // This completely eliminates status corruption issues
    // Users can change status after creation via drag-and-drop
    const mappedStatus: string = 'BACKLOG'

    // Get the highest position in the target status column
    // For standalone tasks (no job_id or quote_id), get max position across all standalone tasks
    let maxPosition
    try {
      const whereClause: any = {
        status: mappedStatus,
      }
      
      // Build where clause for job_id and quote_id
      // For standalone tasks (both null), we need to explicitly check for null
      if (job_id) {
        whereClause.jobId = job_id
      } else {
        // For standalone tasks, jobId must be null
        whereClause.jobId = null
      }
      
      if (quote_id) {
        whereClause.quoteId = quote_id
      } else {
        // For standalone tasks, quoteId must be null
        whereClause.quoteId = null
      }
      
      maxPosition = await prisma.taskCard.findFirst({
        where: whereClause,
        orderBy: { position: 'desc' },
        select: { position: true }
      })
    } catch (error) {
      console.error('[POST /api/tasks] Error finding max position:', error)
      maxPosition = null
    }

    // Build data object with only the fields Prisma expects
    // Make sure all optional fields are explicitly null, not undefined
    const taskData: any = {
      name: title.trim(),
      description: description && description.trim() ? description.trim() : null,
      status: mappedStatus,
      position: (maxPosition?.position ?? -1) + 1,
      taskCode: taskCode && taskCode.trim() ? taskCode.trim() : null,
      taskCodeDescription: taskCodeDescription && taskCodeDescription.trim() ? taskCodeDescription.trim() : null,
      // Always set relation IDs explicitly (null for standalone tasks)
      quoteId: quote_id || null,
      jobId: job_id || null,
      assignedToId: assigned_to || null,
    }
    
    // Only add dueDate if it's provided and valid
    if (dueDate && dueDate.trim()) {
      try {
        const parsedDate = new Date(dueDate)
        if (!isNaN(parsedDate.getTime())) {
          taskData.dueDate = parsedDate
        }
      } catch (e) {
        // Invalid date, skip it
        console.warn('[POST /api/tasks] Invalid dueDate:', dueDate)
      }
    }

    // Status is already set to BACKLOG, no validation needed
    // Set taskData.status to match mappedStatus
    taskData.status = mappedStatus
    
    // Validate taskData before creating
    if (!taskData.name || taskData.name.trim() === '') {
      return NextResponse.json({ 
        success: false,
        error: 'Task name is required' 
      }, { status: 400 })
    }

    // Ensure status is valid
    if (!['BACKLOG', 'IN_PROGRESS', 'WAITING', 'COMPLETED'].includes(taskData.status)) {
      taskData.status = 'BACKLOG'
    }

    console.log('[POST /api/tasks] Creating task with data:', JSON.stringify(taskData, null, 2))

    let task
    try {
      task = await prisma.taskCard.create({
        data: taskData,
        include: {
          quote: {
            select: {
              id: true,
              quoteNumber: true,
              title: true,
            },
          },
          job: {
            select: {
              id: true,
              jobNumber: true,
              title: true,
              type: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })
      console.log('[POST /api/tasks] Task created successfully:', task.id)
    } catch (createError: any) {
      console.error('[POST /api/tasks] Prisma create error:', createError)
      console.error('[POST /api/tasks] Error code:', createError.code)
      console.error('[POST /api/tasks] Error meta:', createError.meta)
      console.error('[POST /api/tasks] Error name:', createError.name)
      console.error('[POST /api/tasks] Task data that failed:', JSON.stringify(taskData, null, 2))
      throw createError
    }

    return NextResponse.json({ success: true, data: task }, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/tasks] Error:', error)
    console.error('[POST /api/tasks] Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      name: error.name,
      stack: error.stack?.substring(0, 500),
    })
    console.error('[POST /api/tasks] Request body was:', JSON.stringify(body, null, 2))
    
    // Provide more helpful error messages
    if (error.code === 'P2002') {
      return NextResponse.json({ 
        success: false,
        error: 'A task with this information already exists' 
      }, { status: 400 })
    }
    if (error.code === 'P2003') {
      const field = error.meta?.field_name || 'reference'
      return NextResponse.json({ 
        success: false,
        error: `Invalid ${field} (job, quote, or user does not exist)` 
      }, { status: 400 })
    }
    
    // Always return valid JSON
    const errorResponse: any = {
      success: false,
      error: error.message || 'Failed to create task',
    }
    
    if (process.env.NODE_ENV === 'development') {
      errorResponse.details = error.stack
      errorResponse.code = error.code
      errorResponse.meta = error.meta
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}


