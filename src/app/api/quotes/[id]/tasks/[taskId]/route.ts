import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * PATCH /api/quotes/[id]/tasks/[taskId]
 * Update a task (including drag-drop position changes)
 */
export async function PATCH(
    request: NextRequest,
    {
        params,
    }: {
        params: Promise<{ id: string; taskId: string }> | { id: string; taskId: string }
    }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const resolvedParams = params instanceof Promise ? await params : params
        const { taskId } = resolvedParams

        const body = await request.json()
        const { name, description, assignedToId, dueDate, status, position } = body

        const updateData: any = {}

        if (name !== undefined) updateData.name = name
        if (description !== undefined) updateData.description = description
        if (assignedToId !== undefined) updateData.assignedToId = assignedToId
        if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null
        if (status !== undefined) updateData.status = status
        if (position !== undefined) updateData.position = position

        const task = await prisma.taskCard.update({
            where: { id: taskId },
            data: updateData,
            include: {
                assignedTo: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        })

        return NextResponse.json({
            success: true,
            data: task
        })
    } catch (error: any) {
        console.error('Error updating task:', error)
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to update task'
            },
            { status: 500 }
        )
    }
}

/**
 * DELETE /api/quotes/[id]/tasks/[taskId]
 * Delete a task
 */
export async function DELETE(
    request: NextRequest,
    {
        params,
    }: {
        params: Promise<{ id: string; taskId: string }> | { id: string; taskId: string }
    }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const resolvedParams = params instanceof Promise ? await params : params
        const { taskId } = resolvedParams

        await prisma.taskCard.delete({
            where: { id: taskId }
        })

        return NextResponse.json({
            success: true,
            message: 'Task deleted successfully'
        })
    } catch (error: any) {
        console.error('Error deleting task:', error)
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to delete task'
            },
            { status: 500 }
        )
    }
}
