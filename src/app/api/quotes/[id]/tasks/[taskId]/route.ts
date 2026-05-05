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

async function syncQuotePrefixTotalsToLabor(quoteId: string) {
        const rows = await prisma.taskCard.findMany({
                where: { quoteId, taskCode: { not: null } },
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
                await prisma.quoteLaborEstimate.upsert({
                        where: { quoteId_laborCodeId: { quoteId, laborCodeId: lc.id } },
                        update: { estimatedHours: hours },
                        create: { quoteId, laborCodeId: lc.id, estimatedHours: hours },
                })
        }
}

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
        const { id: quoteId, taskId } = resolvedParams

        const body = await request.json()
        const { name, description, assignedToId, dueDate, status, position, estimatedHours, laborCodeId } = body

        const updateData: any = {}

        if (name !== undefined) updateData.name = name
        if (description !== undefined) updateData.description = description
        if (assignedToId !== undefined) updateData.assignedToId = assignedToId
        if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null
        if (estimatedHours !== undefined) {
            const hoursNum = estimatedHours === '' || estimatedHours == null ? null : Number(estimatedHours)
            if (hoursNum != null && (!Number.isFinite(hoursNum) || hoursNum < 0)) {
                return NextResponse.json(
                    { success: false, error: 'Estimated hours must be a non-negative number' },
                    { status: 400 }
                )
            }
            updateData.estimatedHours = hoursNum == null ? null : hoursNum
        }
        if (laborCodeId !== undefined) updateData.laborCodeId = laborCodeId || null
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

        if (task.taskCode) {
            await syncQuotePrefixTotalsToLabor(quoteId)
        }

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
        const { id: quoteId, taskId } = resolvedParams

        const deleted = await prisma.taskCard.delete({
            where: { id: taskId }
        })

        if (deleted.taskCode) {
                await syncQuotePrefixTotalsToLabor(quoteId)
        }

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
