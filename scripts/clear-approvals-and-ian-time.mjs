/**
 * One-off: clear approvals workflow records + wipe Ian Woloshyn time tracking.
 *
 * Dry run (default):
 *   node scripts/clear-approvals-and-ian-time.mjs
 *
 * Actually run (DESTRUCTIVE):
 *   CONFIRM=1 node scripts/clear-approvals-and-ian-time.mjs
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const confirmed = process.env.CONFIRM === '1'

function logHeader(title) {
  console.log('\n' + '='.repeat(80))
  console.log(title)
  console.log('='.repeat(80))
}

async function main() {
  logHeader(`Mode: ${confirmed ? 'DESTRUCTIVE (CONFIRM=1)' : 'DRY RUN (set CONFIRM=1 to execute)'}`)

  // 1) Clear approvals database (workflow records only; do not delete core time rows)
  logHeader('Clearing approvals workflow records')
  const submissionsWithRefs = await prisma.timeEntry.count({
    where: { submissionId: { not: null } },
  })
  const submissionsCount = await prisma.timesheetSubmission.count()
  const changeReqCount = await prisma.timeChangeRequest.count()

  console.log('Would unlink TimeEntry.submissionId rows:', submissionsWithRefs)
  console.log('Would delete TimesheetSubmission rows:', submissionsCount)
  console.log('Would delete TimeChangeRequest rows:', changeReqCount)

  if (confirmed) {
    await prisma.$transaction(async (tx) => {
      await tx.timeEntry.updateMany({
        where: { submissionId: { not: null } },
        data: { submissionId: null },
      })
      await tx.timesheetSubmission.deleteMany({})
      await tx.timeChangeRequest.deleteMany({})
    })
    console.log('Approvals workflow records cleared.')
  }

  // 2) Wipe Ian Woloshyn's time tracking (time entries, punches, submissions, requests)
  logHeader("Wiping Ian Woloshyn's time tracking")

  const ian = await prisma.user.findFirst({
    where: {
      OR: [
        { name: { equals: 'Ian Woloshyn', mode: 'insensitive' } },
        { name: { contains: 'Ian Woloshyn', mode: 'insensitive' } },
        { name: { contains: 'Woloshyn', mode: 'insensitive' } },
        { email: { contains: 'woloshyn', mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, email: true },
  })

  if (!ian) {
    console.log('Could not find a user matching "Ian Woloshyn" (by name/email). Nothing to wipe.')
    return
  }

  console.log('Matched user:', ian)

  const ianTimesheets = await prisma.timesheet.findMany({
    where: { userId: ian.id },
    select: { id: true },
  })
  const timesheetIds = ianTimesheets.map((t) => t.id)

  const counts = {
    timeEntries: await prisma.timeEntry.count({ where: { userId: ian.id } }),
    devTimeEntries: await prisma.devTimeEntry.count({ where: { userId: ian.id } }),
    submissions: await prisma.timesheetSubmission.count({ where: { userId: ian.id } }),
    timeChangeRequests: await prisma.timeChangeRequest.count({ where: { userId: ian.id } }),
    timesheets: timesheetIds.length,
    jobEntries: timesheetIds.length
      ? await prisma.jobEntry.count({ where: { timesheetId: { in: timesheetIds } } })
      : 0,
  }

  console.log('Would delete:', counts)

  if (confirmed) {
    await prisma.$transaction(async (tx) => {
      if (timesheetIds.length) {
        await tx.jobEntry.deleteMany({ where: { timesheetId: { in: timesheetIds } } })
      }
      await tx.timeChangeRequest.deleteMany({ where: { userId: ian.id } })
      await tx.timeEntry.deleteMany({ where: { userId: ian.id } })
      await tx.devTimeEntry.deleteMany({ where: { userId: ian.id } })
      await tx.timesheetSubmission.deleteMany({ where: { userId: ian.id } })
      await tx.timesheet.deleteMany({ where: { userId: ian.id } })
    })
    console.log("Ian Woloshyn's time tracking wiped.")
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

