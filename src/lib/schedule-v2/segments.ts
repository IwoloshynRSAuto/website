import type { PrismaClient } from '@prisma/client'

export async function sumSegmentHoursForEstimate(
  prisma: PrismaClient,
  jobLaborEstimateId: string,
  excludeSegmentId?: string
): Promise<number> {
  const agg = await prisma.jobLaborScheduleSegment.aggregate({
    where: {
      jobLaborEstimateId,
      ...(excludeSegmentId ? { id: { not: excludeSegmentId } } : {}),
    },
    _sum: { hours: true },
  })
  return Number(agg._sum.hours ?? 0)
}

/** Returns remaining hours that can still be placed in segments for this estimate. */
export async function remainingScheduleHours(
  prisma: PrismaClient,
  jobLaborEstimateId: string,
  excludeSegmentId?: string
): Promise<{ estimated: number; scheduled: number; remaining: number }> {
  const est = await prisma.jobLaborEstimate.findUnique({
    where: { id: jobLaborEstimateId },
    select: { estimatedHours: true },
  })
  if (!est) throw new Error('JobLaborEstimate not found')
  const estimated = Number(est.estimatedHours) || 0
  const scheduled = await sumSegmentHoursForEstimate(prisma, jobLaborEstimateId, excludeSegmentId)
  return { estimated, scheduled, remaining: Math.max(0, estimated - scheduled) }
}

export function assertWindow(ws: Date, we: Date) {
  if (!(we.getTime() > ws.getTime())) {
    throw new Error('windowEnd must be after windowStart')
  }
}
