import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { QuoteService } from '@/lib/quotes/service'

/**
 * GET /api/quotes/aging
 * Get quotes with aging alerts
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const agingDays = parseInt(searchParams.get('days') || '30', 10)

    const agingQuotes = await QuoteService.getAgingQuotes(agingDays)

    return NextResponse.json({
      success: true,
      data: agingQuotes,
    })
  } catch (error: any) {
    console.error('Error fetching aging quotes:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch aging quotes', details: error.message },
      { status: 500 }
    )
  }
}

