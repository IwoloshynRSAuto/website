import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PartSaleService } from '@/lib/part-sales/service'

/**
 * POST /api/part-sales/[id]/convert
 * Convert part sale to job (if installation required)
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

    // Handle params - could be a Promise in Next.js 15+
    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams

    const body = await request.json()
    const job = await PartSaleService.convertToJob(id, session.user.id, body)

    return NextResponse.json(
      {
        success: true,
        data: job,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error converting part sale to job:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to convert part sale to job',
      },
      { status: 500 }
    )
  }
}

