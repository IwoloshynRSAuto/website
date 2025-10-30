import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: jobId } = params
    const body = await request.json()
    const { laborCodeId, estimatedHours } = body

    if (!laborCodeId || estimatedHours === undefined) {
      return NextResponse.json(
        { error: 'laborCodeId and estimatedHours are required' },
        { status: 400 }
      )
    }

    // Upsert the job labor estimate (update if exists, create if not)
    const laborEstimate = await prisma.jobLaborEstimate.upsert({
      where: {
        jobId_laborCodeId: {
          jobId,
          laborCodeId
        }
      },
      update: {
        estimatedHours: parseFloat(estimatedHours)
      },
      create: {
        jobId,
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

