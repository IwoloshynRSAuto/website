import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function prefixFromTaskCode(code: unknown): 'PM' | 'AD' | 'SV' | null {
    const t = String(code || '').trim().toUpperCase()
    if (t.length < 2) return null
    const p = t.slice(0, 2)
    return p === 'PM' || p === 'AD' || p === 'SV' ? (p as any) : null
}

async function syncJobPrefixTotalsToLabor(jobId: string) {
    const rows = await prisma.taskCard.findMany({
        where: { jobId, taskCode: { not: null } },
        select: { taskCode: true, estimatedHours: true },
    })

    const totals: Record<'PM' | 'AD' | 'SV', number> = { PM: 0, AD: 0, SV: 0 }
    for (const r of rows) {
        const p = prefixFromTaskCode(r.taskCode)
        if (!p) continue
        totals[p] += Number(r.estimatedHours || 0)
    }

    const laborCodes = await prisma.laborCode.findMany({
        where: { code: { in: ['PM', 'AD', 'SV'], mode: 'insensitive' } as any },
        select: { id: true, code: true },
    })

    for (const lc of laborCodes) {
        const key = String(lc.code).trim().toUpperCase() as 'PM' | 'AD' | 'SV'
        const hours = totals[key] ?? 0
        await prisma.jobLaborEstimate.upsert({
            where: { jobId_laborCodeId: { jobId, laborCodeId: lc.id } },
            update: { estimatedHours: hours },
            create: { jobId, laborCodeId: lc.id, estimatedHours: hours },
        })
    }
}

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
        const { name, description, assignedToId, dueDate, status, taskCode, taskCodeDescription, estimatedHours, laborCodeId } = body

        if (!name) {
            return NextResponse.json(
                { success: false, error: 'Task name is required' },
                { status: 400 }
            )
        }

        const hoursNum = estimatedHours === '' || estimatedHours == null ? null : Number(estimatedHours)
        if (hoursNum != null && (!Number.isFinite(hoursNum) || hoursNum < 0)) {
            return NextResponse.json(
                { success: false, error: 'Estimated hours must be a non-negative number' },
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
                estimatedHours: hoursNum == null ? null : hoursNum,
                laborCodeId: laborCodeId || null,
                status: status || 'BACKLOG',
                position: (maxPosition?.position ?? -1) + 1,
                taskCode: taskCode || null,
                taskCodeDescription: taskCodeDescription || null,
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

        if (taskCode) {
            await syncJobPrefixTotalsToLabor(id)
        }

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
