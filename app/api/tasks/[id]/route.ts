import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// PUT /api/tasks/{id}
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const taskId = resolvedParams.id

    const body = await request.json()
    const { title, description, assigned_to, status } = body

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (assigned_to !== undefined) updateData.assignedTo = assigned_to
    if (status !== undefined) updateData.status = status

    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
    })

    return NextResponse.json({ success: true, data: task })
  } catch (error: any) {
    console.error('[PUT /api/tasks/{id}] Error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message || 'Failed to update task' }, { status: 500 })
  }
}

// DELETE /api/tasks/{id}
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const taskId = resolvedParams.id

    await prisma.task.delete({
      where: { id: taskId },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[DELETE /api/tasks/{id}] Error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message || 'Failed to delete task' }, { status: 500 })
  }
}


