/**
 * Deletes all quotes and jobs (and dependent rows). Preserves users, customers, labor codes, etc.
 * Run: node scripts/clear-quotes-and-jobs.js
 */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Clearing quotes and jobs…')
  await prisma.$transaction(async (tx) => {
    await tx.timeEntry.deleteMany({})
    await tx.fileRecord.updateMany({
      data: { linkedQuoteId: null, linkedJobId: null },
    })
    await tx.bOM.updateMany({ data: { linkedQuoteId: null } })
    await tx.job.deleteMany({})
    await tx.quote.deleteMany({})
  })
  console.log('Done. Quotes and jobs removed.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
