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

  const quote =
    (await tx.quote.findFirst({
      where: { quoteNumber: trimmed },
      select: { id: true, quoteNumber: true, title: true, customerId: true },
    })) ??
    (normalized && normalized !== trimmed
      ? await tx.quote.findFirst({
          where: { quoteNumber: normalized },
          select: { id: true, quoteNumber: true, title: true, customerId: true },
        })
      : null)

  if (quote) {
    const linked = await tx.job.findFirst({
      where: { quoteId: quote.id },
      select: {
        id: true,
        jobNumber: true,
        title: true,
        quoteId: true,
        customerId: true,
        createdById: true,
        status: true,
        type: true,
        priority: true,
      },
    })
    if (linked) {
      return await tx.job.findUniqueOrThrow({ where: { id: linked.id } })
    }

    return tx.job.create({
      data: {
        jobNumber: quote.quoteNumber,
        title: quote.title?.trim() ? quote.title : `Quote ${quote.quoteNumber}`,
        type: 'JOB',
        status: 'ACTIVE',
        priority: 'MEDIUM',
        createdById,
        customerId: quote.customerId ?? undefined,
        quoteId: quote.id,
      },
    })
  }

  const jobNumberToCreate = normalized || trimmed

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
