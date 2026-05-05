import type { PrismaClient } from '@prisma/client'

export async function sumAssignmentHoursForSegment(
  prisma: PrismaClient,
  segmentId: string,
  excludeAssignmentId?: string
): Promise<number> {
  const agg = await prisma.jobLaborScheduleAssignment.aggregate({
    where: {
      segmentId,
      ...(excludeAssignmentId ? { id: { not: excludeAssignmentId } } : {}),
    },
    _sum: { hours: true },
  })
  return Number(agg._sum.hours ?? 0)
}
