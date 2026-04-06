/**
 * Destructive: removes all Time & Attendance operational data:
 * - time_entries (job labor hours)
 * - timesheet_submissions (weekly TIME + ATTENDANCE submissions)
 * - timesheets (punch records; cascades job_entries + time_change_requests)
 *
 * Does NOT delete: users, jobs, customers, labor_codes, quotes, etc.
 *
 * Usage: node scripts/clear-timesheet-data.js
 * Requires DATABASE_URL (e.g. from .env.production)
 */
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const result = await prisma.$transaction(async (tx) => {
    const timeEntries = await tx.timeEntry.deleteMany({})
    const submissions = await tx.timesheetSubmission.deleteMany({})
    const timesheets = await tx.timesheet.deleteMany({})
    return { timeEntries, submissions, timesheets }
  })

  console.log('Done.')
  console.log('  time_entries deleted:        ', result.timeEntries.count)
  console.log('  timesheet_submissions deleted:', result.submissions.count)
  console.log('  timesheets deleted:          ', result.timesheets.count)
  console.log('  (job_entries & time_change_requests cleared via timesheet cascade)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
