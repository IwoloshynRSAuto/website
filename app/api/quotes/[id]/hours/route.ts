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

        return NextResponse.json({
            success: true,
            data: []
        })
    } catch (error: any) {
        console.error('Error fetching quote hours:', error)
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to fetch quote hours'
            },
            { status: 500 }
        )
    }
}
