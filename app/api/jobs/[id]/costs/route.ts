import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { JobService } from '@/lib/jobs/service'

/**
 * GET /api/jobs/[id]/costs
 * Calculate job costs and hours
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

    // Handle params - could be a Promise in Next.js 15+
    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams

    // Use JobService to calculate costs
    const costs = await JobService.calculateJobCosts(id)

    return NextResponse.json({
      success: true,
      data: costs,
    })
  } catch (error: any) {
    console.error('Error calculating job costs:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to calculate job costs',
      },
      { status: 500 }
    )
  }
}

