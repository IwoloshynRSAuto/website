import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const { id: quoteId } = resolvedParams
    const body = await request.json()
    const { laborCodeId, estimatedHours } = body

    if (!laborCodeId || estimatedHours === undefined) {
      return NextResponse.json(
        { error: 'laborCodeId and estimatedHours are required' },
        { status: 400 }
      )
    }

    // Upsert the quote labor estimate (update if exists, create if not)
    const laborEstimate = await prisma.quoteLaborEstimate.upsert({
      where: {
        quoteId_laborCodeId: {
          quoteId,
          laborCodeId
        }
      },
      update: {
        estimatedHours: parseFloat(estimatedHours)
      },
      create: {
        quoteId,
        laborCodeId,
        estimatedHours: parseFloat(estimatedHours)
      }
    })

    return NextResponse.json(laborEstimate, { status: 200 })
  } catch (error: any) {
    console.error('Error updating quoted labor:', error)
    return NextResponse.json(
      { error: 'Failed to update quoted labor', details: error.message },
      { status: 500 }
    )
  }
}


