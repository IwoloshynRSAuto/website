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
        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const resolvedParams = params instanceof Promise ? await params : params
        const { id: jobId } = resolvedParams

        const timeEntries = await prisma.timeEntry.findMany({
            where: {
                jobId: jobId
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                laborCode: {
                    select: {
                        id: true,
                        code: true,
                        name: true
                    }
                },
                submission: {
                    select: {
                        id: true,
                        status: true,
                        submittedAt: true
                    }
                }
            },
            orderBy: {
                date: 'desc'
            }
        })

        return NextResponse.json({
            success: true,
            data: timeEntries
        })
    } catch (error: any) {
        console.error('Error fetching job hours:', error)
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to fetch job hours'
            },
            { status: 500 }
        )
    }
}
