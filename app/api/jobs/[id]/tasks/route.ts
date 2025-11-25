import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/jobs/[id]/tasks
 * Get all tasks for a job
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> | { id: string } }
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
        const { id } = resolvedParams

        const tasks = await prisma.taskCard.findMany({
            where: { jobId: id },
            include: {
                assignedTo: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: [
                { status: 'asc' },
                { position: 'asc' }
            ]
        })

        return NextResponse.json({
            success: true,
            data: tasks
        })
    } catch (error: any) {
        console.error('Error fetching tasks:', error)
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to fetch tasks'
            },
            { status: 500 }
        )
    }
}

/**
 * POST /api/jobs/[id]/tasks
 * Create a new task for a job
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> | { id: string } }
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
        const { id } = resolvedParams

        const body = await request.json()
        const { name, description, assignedToId, dueDate, status } = body

        if (!name) {
            return NextResponse.json(
                { success: false, error: 'Task name is required' },
                { status: 400 }
            )
        }

        // Get the highest position in the target status column
        const maxPosition = await prisma.taskCard.findFirst({
            where: {
                jobId: id,
                status: status || 'BACKLOG'
            },
            orderBy: { position: 'desc' },
            select: { position: true }
        })

        const task = await prisma.taskCard.create({
            data: {
                jobId: id,
                name,
                description: description || null,
                assignedToId: assignedToId || null,
                dueDate: dueDate ? new Date(dueDate) : null,
                status: status || 'BACKLOG',
                position: (maxPosition?.position ?? -1) + 1
            },
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

        return NextResponse.json(
            {
                success: true,
                data: task
            },
            { status: 201 }
        )
    } catch (error: any) {
        console.error('Error creating task:', error)
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to create task'
            },
            { status: 500 }
        )
    }
}
