import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  /** e.g. E0001 — match is case-insensitive */
  jobNumber: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const raw = await request.json().catch(() => ({}))
  const { jobNumber } = bodySchema.parse(raw)

  const job = await prisma.job.findFirst({
    where: { jobNumber: { equals: jobNumber.trim(), mode: 'insensitive' } },
    select: { id: true, jobNumber: true, title: true },
  })

  if (!job) {
    return NextResponse.json({ success: false, error: `No job found with number matching ${jobNumber}` }, { status: 404 })
  }

  const result = await prisma.$transaction(async (tx) => {
    const entries = await tx.timeEntry.findMany({
      where: { jobId: job.id },
      select: { submissionId: true },
    })
    const submissionIds = [...new Set(entries.map((e) => e.submissionId).filter(Boolean))] as string[]

    const deletedEntries = await tx.timeEntry.deleteMany({ where: { jobId: job.id } })

    if (submissionIds.length > 0) {
      await tx.timesheetSubmission.updateMany({
        where: { id: { in: submissionIds } },
        data: {
          status: 'DRAFT',
          submittedAt: null,
          approvedAt: null,
          approvedById: null,
          rejectedAt: null,
          rejectedById: null,
          rejectionReason: null,
        },
      })
    }

    const deletedDev = await tx.devTimeEntry.deleteMany({ where: { jobId: job.id } })

    await tx.jobLaborScheduleSegment.deleteMany({ where: { estimate: { jobId: job.id } } })

    const deletedExpenses = await tx.expenseReport.deleteMany({ where: { jobId: job.id } })

    const deletedJobEntries = await tx.jobEntry.deleteMany({
      where: { jobNumber: { equals: job.jobNumber, mode: 'insensitive' } },
    })

    return {
      deletedEntries: deletedEntries.count,
      submissionsTouched: submissionIds.length,
      deletedDev: deletedDev.count,
      deletedExpenses: deletedExpenses.count,
      deletedJobEntries: deletedJobEntries.count,
    }
  })

  return NextResponse.json({
    success: true,
    data: {
      jobId: job.id,
      jobNumber: job.jobNumber,
      title: job.title,
      ...result,
    },
  })
}
