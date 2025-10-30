import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { ecoId } = body

    if (!ecoId) {
      return NextResponse.json({ error: 'ECO ID is required' }, { status: 400 })
    }

    // Get the ECO
    const eco = await prisma.engineeringChangeOrder.findUnique({
      where: { id: ecoId },
      include: { job: true }
    })

    if (!eco) {
      return NextResponse.json({ error: 'ECO not found' }, { status: 404 })
    }

    if (eco.status !== 'PENDING') {
      return NextResponse.json({ error: 'ECO has already been processed' }, { status: 400 })
    }

    // Apply the ECO by updating the job totals (but keep original labor estimates)
    const updatedJob = await prisma.job.update({
      where: { id: eco.jobId },
      data: {
        estimatedHours: eco.newHours,
        estimatedCost: eco.newCost,
        currentRevision: eco.revision,
        updatedAt: new Date()
      }
    })

    // Get the ECO with labor changes
    const ecoWithChanges = await prisma.engineeringChangeOrder.findUnique({
      where: { id: ecoId },
      select: { laborChanges: true }
    })

    // Apply ECO changes by updating labor estimates to new values
    if (ecoWithChanges?.laborChanges) {
      const laborChanges = JSON.parse(ecoWithChanges.laborChanges) as Array<{
        id: string
        laborCodeId: string
        hours: number
        isNew?: boolean
      }>

      // Update or create labor estimates with new values
      for (const change of laborChanges) {
        // Check if this labor code already has estimates for this job
        const existingEstimate = await prisma.jobLaborEstimate.findFirst({
          where: { 
            jobId: eco.jobId,
            laborCodeId: change.laborCodeId
          }
        })

        if (existingEstimate) {
          // Update existing estimate to new value
          await prisma.jobLaborEstimate.update({
            where: { id: existingEstimate.id },
            data: {
              estimatedHours: change.hours
            }
          })
        } else {
          // Create new estimate
          await prisma.jobLaborEstimate.create({
            data: {
              jobId: eco.jobId,
              laborCodeId: change.laborCodeId,
              estimatedHours: change.hours
            }
          })
        }
      }
    }

    // Update the ECO status
    const updatedEco = await prisma.engineeringChangeOrder.update({
      where: { id: ecoId },
      data: {
        status: 'APPLIED',
        appliedAt: new Date()
      }
    })

    return NextResponse.json({ 
      message: 'ECO applied successfully',
      job: updatedJob,
      eco: updatedEco
    })
  } catch (error) {
    console.error('Error applying ECO:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
