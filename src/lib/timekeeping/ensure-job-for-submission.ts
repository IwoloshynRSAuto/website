import type { Prisma } from '@prisma/client'
import { normalizeProjectJobNumber } from '@/lib/utils/job-number'

/**
 * Find an existing Job by number (exact or E-normalized), or create a minimal JOB row
 * so timesheet submissions can proceed without pre-seeded jobs.
 */
export async function ensureJobForTimeSubmission(
  tx: Prisma.TransactionClient,
  rawJobNumber: string,
  createdById: string
) {
  const trimmed = rawJobNumber.trim()
  if (!trimmed) {
    throw new Error('Job number is required')
  }

  const normalized = normalizeProjectJobNumber(trimmed)
  const candidates = [trimmed, normalized].filter((v, i, a) => v && a.indexOf(v) === i)

  for (const jn of candidates) {
    const found = await tx.job.findFirst({ where: { jobNumber: jn } })
    if (found) return found
  }

  const isQuoteLike = /^Q/i.test(trimmed)
  const jobNumberToCreate = isQuoteLike ? trimmed : normalized || trimmed

  return tx.job.create({
    data: {
      jobNumber: jobNumberToCreate,
      title: `Job ${jobNumberToCreate}`,
      type: 'JOB',
      status: 'ACTIVE',
      priority: 'MEDIUM',
      createdById,
    },
  })
}
