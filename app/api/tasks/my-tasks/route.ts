import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/tasks/my-tasks?userId={id} - Get all tasks assigned to a user (or current user if no userId param)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const requestedUserId = searchParams.get('userId')
    
    // If userId param is provided, check if user is admin/manager
    const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'MANAGER'
    const targetUserId = requestedUserId && isAdmin ? requestedUserId : session.user.id

    const tasks = await prisma.task.findMany({
      where: {
        assignedTo: targetUserId,
      },
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
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: tasks })
  } catch (error: any) {
    console.error('[GET /api/tasks/my-tasks] Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch tasks' }, { status: 500 })
  }
}

