/**
 * One-off: clear time entries, schedule, expenses, job entries for a job number.
 * Usage: node scripts/reset-test-job.mjs E0001
 */
import { PrismaClient } from '@prisma/client'

const jobNumber = process.argv[2] || 'E0001'
const prisma = new PrismaClient()

async function main() {
  const job = await prisma.job.findFirst({
    where: { jobNumber: { equals: jobNumber, mode: 'insensitive' } },
    select: { id: true, jobNumber: true, title: true },
  })
  if (!job) {
    console.error('Job not found:', jobNumber)
    process.exit(1)
  }
  const entries = await prisma.timeEntry.findMany({
    where: { jobId: job.id },
    select: { submissionId: true },
  })
  const submissionIds = [...new Set(entries.map((e) => e.submissionId).filter(Boolean))]

  await prisma.$transaction(async (tx) => {
    await tx.timeEntry.deleteMany({ where: { jobId: job.id } })
    if (submissionIds.length) {
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
    await tx.devTimeEntry.deleteMany({ where: { jobId: job.id } })
    await tx.jobLaborScheduleSegment.deleteMany({ where: { estimate: { jobId: job.id } } })
    await tx.expenseReport.deleteMany({ where: { jobId: job.id } })
    await tx.jobEntry.deleteMany({
      where: { jobNumber: { equals: job.jobNumber, mode: 'insensitive' } },
    })
  })

  console.log('Reset complete for', job.jobNumber, job.title)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
