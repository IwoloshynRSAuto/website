/**
 * Clear All Timesheet Submissions
 * 
 * This script deletes ALL TimesheetSubmission records and their linked TimeEntries.
 * This will completely clear the timesheet submission system.
 * 
 * DELETES:
 *   - ALL TimesheetSubmission records (all statuses: DRAFT, SUBMITTED, APPROVED, REJECTED)
 *   - ALL TimeEntry records linked to submissions
 * 
 * PRESERVES:
 *   - Timesheet records (attendance/clock-in data)
 *   - All User, Job, LaborCode, and other data
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function clearAllTimesheetSubmissions() {
  try {
    console.log('🔍 Verifying current state...\n')

    // Count all submissions by status
    const totalSubmissions = await prisma.timesheetSubmission.count()
    const statusCounts = await prisma.timesheetSubmission.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    })

    // Count TimeEntries linked to submissions
    const linkedTimeEntryCount = await prisma.timeEntry.count({
      where: {
        submissionId: { not: null }
      }
    })

    // Count TimeEntries NOT linked to submissions
    const unlinkedTimeEntryCount = await prisma.timeEntry.count({
      where: {
        submissionId: null
      }
    })

    // Count other data that will be preserved
    const timesheetCount = await prisma.timesheet.count()
    const userCount = await prisma.user.count()
    const jobCount = await prisma.job.count()

    console.log('📊 BEFORE Deletion - Current Data Counts:')
    console.log(`   TimesheetSubmissions (total): ${totalSubmissions}`)
    statusCounts.forEach(item => {
      console.log(`     - ${item.status}: ${item._count.id}`)
    })
    console.log(`   TimeEntries (linked to submissions): ${linkedTimeEntryCount} (will be DELETED)`)
    console.log(`   TimeEntries (NOT linked): ${unlinkedTimeEntryCount} (will be preserved)`)
    console.log(`   Timesheets (attendance - will be preserved): ${timesheetCount}`)
    console.log(`   Users (will be preserved): ${userCount}`)
    console.log(`   Jobs (will be preserved): ${jobCount}`)

    if (totalSubmissions === 0) {
      console.log('\n✅ No timesheet submissions to delete')
      return { deletedSubmissions: 0, deletedTimeEntries: 0 }
    }

    // Show sample records that will be deleted
    console.log('\n📋 Sample TimesheetSubmissions to be DELETED:')
    const sampleSubmissions = await prisma.timesheetSubmission.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        weekStart: true,
        weekEnd: true,
        type: true,
        status: true,
        createdAt: true
      }
    })
    sampleSubmissions.forEach((sub, idx) => {
      console.log(`   ${idx + 1}. ID: ${sub.id}, Week: ${sub.weekStart.toISOString().split('T')[0]} to ${sub.weekEnd.toISOString().split('T')[0]}, Type: ${sub.type}, Status: ${sub.status}`)
    })

    console.log('\n⚠️  WARNING: This will DELETE ALL timesheet submissions!')
    console.log('   - ALL TimesheetSubmission records will be DELETED (all statuses)')
    console.log('   - ALL TimeEntry records linked to submissions will be DELETED')
    console.log('   - TimesheetSubmission records: 0 (all deleted)')
    console.log('   - TimeEntry records linked to submissions: 0 (all deleted)')
    console.log('   - TimeEntry records NOT linked to submissions will be preserved')
    console.log('   - Timesheet records (attendance) will be preserved')
    console.log('   - All other data (Users, Jobs, etc.) will be preserved\n')

    // Use a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Step 1: Delete ALL TimeEntry records linked to submissions
      const deletedTimeEntries = await tx.timeEntry.deleteMany({
        where: {
          submissionId: { not: null }
        }
      })
      console.log(`✅ Deleted ${deletedTimeEntries.count} TimeEntry records linked to submissions`)

      // Step 2: Delete ALL TimesheetSubmission records
      const deletedSubmissions = await tx.timesheetSubmission.deleteMany({})
      console.log(`✅ Deleted ${deletedSubmissions.count} TimesheetSubmission records (all statuses)`)

      return {
        deletedSubmissions: deletedSubmissions.count,
        deletedTimeEntries: deletedTimeEntries.count
      }
    })

    console.log('\n🔍 Verifying deletion...\n')

    // Verify deletion
    const remainingSubmissions = await prisma.timesheetSubmission.count()
    const remainingLinkedTimeEntries = await prisma.timeEntry.count({
      where: {
        submissionId: { not: null }
      }
    })
    const preservedUnlinkedTimeEntries = await prisma.timeEntry.count({
      where: {
        submissionId: null
      }
    })
    const preservedTimesheets = await prisma.timesheet.count()
    const preservedUsers = await prisma.user.count()
    const preservedJobs = await prisma.job.count()

    console.log('📊 AFTER Deletion - Post-Deletion Data Counts:')
    console.log(`   TimesheetSubmissions (total): ${remainingSubmissions} (expected: 0, was: ${totalSubmissions})`)
    console.log(`   TimeEntries (linked to submissions): ${remainingLinkedTimeEntries} (expected: 0, was: ${linkedTimeEntryCount})`)
    console.log(`   TimeEntries (NOT linked - preserved): ${preservedUnlinkedTimeEntries} (was: ${unlinkedTimeEntryCount})`)
    console.log(`   Timesheets (attendance - preserved): ${preservedTimesheets} (was: ${timesheetCount})`)
    console.log(`   Users (preserved): ${preservedUsers} (was: ${userCount})`)
    console.log(`   Jobs (preserved): ${preservedJobs} (was: ${jobCount})`)

    // Validation
    const allSubmissionsDeleted = remainingSubmissions === 0
    const allLinkedEntriesDeleted = remainingLinkedTimeEntries === 0
    const unlinkedEntriesPreserved = preservedUnlinkedTimeEntries === unlinkedTimeEntryCount
    const timesheetsPreserved = preservedTimesheets === timesheetCount
    const usersPreserved = preservedUsers === userCount
    const jobsPreserved = preservedJobs === jobCount

    console.log('\n✅ Deletion Summary:')
    console.log(`   Deleted ${result.deletedSubmissions} TimesheetSubmission records (all statuses)`)
    console.log(`   Deleted ${result.deletedTimeEntries} TimeEntry records (linked to submissions)`)
    console.log(`   Preserved ${preservedUnlinkedTimeEntries} TimeEntry records (not linked to submissions)`)
    console.log(`   Preserved ${preservedTimesheets} Timesheet records (attendance)`)
    console.log(`   Preserved ${preservedUsers} Users`)
    console.log(`   Preserved ${preservedJobs} Jobs`)

    // Detailed validation results
    const validationResults = []
    if (allSubmissionsDeleted) {
      validationResults.push('✅ All TimesheetSubmission records deleted')
    } else {
      validationResults.push(`⚠️  ${remainingSubmissions} TimesheetSubmission records still remain`)
    }

    if (allLinkedEntriesDeleted) {
      validationResults.push('✅ All TimeEntry records linked to submissions deleted')
    } else {
      validationResults.push(`⚠️  ${remainingLinkedTimeEntries} TimeEntry records linked to submissions still remain`)
    }

    if (unlinkedEntriesPreserved) {
      validationResults.push('✅ Unlinked TimeEntry records preserved')
    } else {
      validationResults.push('⚠️  Unlinked TimeEntry records count changed (unexpected!)')
    }

    if (timesheetsPreserved) {
      validationResults.push('✅ Timesheet records preserved')
    } else {
      validationResults.push('⚠️  Timesheet records count changed (unexpected!)')
    }

    if (usersPreserved) {
      validationResults.push('✅ Users preserved')
    } else {
      validationResults.push('⚠️  Users count changed (unexpected!)')
    }

    if (jobsPreserved) {
      validationResults.push('✅ Jobs preserved')
    } else {
      validationResults.push('⚠️  Jobs count changed (unexpected!)')
    }

    console.log('\n📋 Validation Results:')
    validationResults.forEach(result => console.log(`   ${result}`))

    const allValid = allSubmissionsDeleted && 
                     allLinkedEntriesDeleted && 
                     unlinkedEntriesPreserved && 
                     timesheetsPreserved && 
                     usersPreserved && 
                     jobsPreserved

    if (allValid) {
      console.log('\n✅ Deletion completed successfully!')
      console.log('   All timesheet submissions have been deleted.')
      console.log('   All attendance approvals will now be empty.')
      console.log('   All other data has been preserved.')
    } else {
      console.log('\n⚠️  Deletion completed with warnings - please review validation results above')
    }

    return result

  } catch (error) {
    console.error('\n❌ Error during deletion:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the deletion
if (require.main === module) {
  clearAllTimesheetSubmissions()
    .then(() => {
      console.log('\n✅ Script completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error)
      process.exit(1)
    })
}

module.exports = { clearAllTimesheetSubmissions }

