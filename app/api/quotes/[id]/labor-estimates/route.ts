import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { QuoteService } from '@/lib/quotes/service'

/**
 * GET /api/quotes/[id]/labor-estimates
 * Get estimated labor per discipline for a quote
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams

    const estimates = await QuoteService.getEstimatedLaborPerDiscipline(id)

    return NextResponse.json({
      success: true,
      data: estimates,
    })
  } catch (error: any) {
    console.error('Error fetching labor estimates:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch labor estimates',
      },
      { status: 500 }
    )
  }
}

