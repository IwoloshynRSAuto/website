import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
    request: NextRequest,
    {
        params,
    }: {
        params: Promise<{ id: string; laborCodeId: string }> | { id: string; laborCodeId: string }
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

        // Quotes don't have time entries directly. 
        // If we wanted to show linked job hours, we'd need to find the job first.
        // For now, return empty array.

        return NextResponse.json({
            success: true,
            data: []
        })
    } catch (error: any) {
        console.error('Error fetching labor code hours:', error)
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to fetch labor code hours'
            },
            { status: 500 }
        )
    }
}
