import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSchedulableJobType } from '@/lib/schedule-v2/schedulable-job'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const resolved = params instanceof Promise ? await params : params
  const jobId = resolved.id

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, type: true },
  })
  if (!job || !isSchedulableJobType(job.type)) {
    return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 })
  }

  const rows = await prisma.jobLaborEstimate.findMany({
    where: { jobId },
    include: {
      laborCode: { select: { id: true, code: true, name: true } },
    },
    orderBy: { laborCode: { code: 'asc' } },
  })

  return NextResponse.json({
    success: true,
    data: rows.map((r) => ({
      id: r.id,
      laborCodeId: r.laborCodeId,
      estimatedHours: Number(r.estimatedHours) || 0,
      laborCode: r.laborCode,
    })),
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const jobId = resolvedParams.id

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, type: true, createdById: true },
    })
    if (!job || !isSchedulableJobType(job.type)) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.createdById !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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

