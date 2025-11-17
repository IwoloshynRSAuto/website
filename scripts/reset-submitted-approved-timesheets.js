/**
 * Reset Submitted/Approved Timesheet Submissions to DRAFT and Delete Rejected Ones
 * 
 * This script:
 * 1. Resets TimesheetSubmission records with status "SUBMITTED" or "APPROVED" back to "DRAFT"
 * 2. Deletes TimesheetSubmission records with status "REJECTED" (and their linked TimeEntries)
 * 
 * PRESERVES:
 *   - DRAFT TimesheetSubmission records (unchanged)
 *   - All TimeEntry records linked to DRAFT/SUBMITTED/APPROVED submissions
 *   - All Timesheet records (attendance/clock-in data)
 *   - All User, Job, and other data
 * 
 * RESETS:
 *   - Status: SUBMITTED/APPROVED → DRAFT
 *   - submittedAt: cleared (set to null)
 *   - approvedAt: cleared (set to null)
 *   - approvedById: cleared (set to null)
 * 
 * DELETES:
 *   - REJECTED TimesheetSubmission records
 *   - TimeEntry records linked to REJECTED submissions
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function resetSubmittedApprovedTimesheets() {
  try {
    console.log('🔍 Verifying current state...\n')

    // Count records before reset - with status breakdown
    const totalSubmissions = await prisma.timesheetSubmission.count()
    const submittedSubmissions = await prisma.timesheetSubmission.count({
      where: { status: 'SUBMITTED' }
    })
    const approvedSubmissions = await prisma.timesheetSubmission.count({
      where: { status: 'APPROVED' }
    })
    const rejectedSubmissions = await prisma.timesheetSubmission.count({
      where: { status: 'REJECTED' }
    })
    const draftSubmissions = await prisma.timesheetSubmission.count({
      where: { status: 'DRAFT' }
    })

    // Get IDs of submissions to be reset (SUBMITTED/APPROVED only)
    const submissionsToReset = await prisma.timesheetSubmission.findMany({
      where: {
        status: { in: ['SUBMITTED', 'APPROVED'] }
      },
      select: { 
        id: true,
        status: true,
        userId: true,
        weekStart: true,
        weekEnd: true,
        type: true
      }
    })
    const submissionIdsToReset = submissionsToReset.map(s => s.id)

    // Get IDs of REJECTED submissions to be deleted
    const rejectedSubmissionsToDelete = await prisma.timesheetSubmission.findMany({
      where: {
        status: 'REJECTED'
      },
      select: { id: true }
    })
    const rejectedSubmissionIds = rejectedSubmissionsToDelete.map(s => s.id)

    // Count TimeEntries linked to submissions that will be reset (SUBMITTED/APPROVED)
    const linkedTimeEntryCount = submissionIdsToReset.length > 0
      ? await prisma.timeEntry.count({
          where: { submissionId: { in: submissionIdsToReset } }
        })
      : 0

    // Count TimeEntries linked to REJECTED submissions (will be deleted)
    const linkedToRejectedCount = rejectedSubmissionIds.length > 0
      ? await prisma.timeEntry.count({
          where: { submissionId: { in: rejectedSubmissionIds } }
        })
      : 0

    // Count TimeEntries linked to preserved submissions (DRAFT only)
    const preservedLinkedTimeEntryCount = await prisma.timeEntry.count({
      where: {
        submission: {
          status: 'DRAFT'
        }
      }
    })

    // Count TimeEntries NOT linked to any submission
    const unlinkedTimeEntryCount = await prisma.timeEntry.count({
      where: { submissionId: null }
    })

    const timesheetCount = await prisma.timesheet.count()
    const userCount = await prisma.user.count()
    const jobCount = await prisma.job.count()

    console.log('📊 BEFORE Reset - Current Data Counts:')
    console.log(`   TimesheetSubmissions (total): ${totalSubmissions}`)
    console.log(`     - SUBMITTED: ${submittedSubmissions} (will be reset to DRAFT)`)
    console.log(`     - APPROVED: ${approvedSubmissions} (will be reset to DRAFT)`)
    console.log(`     - REJECTED: ${rejectedSubmissions} (will be DELETED)`)
    console.log(`     - DRAFT: ${draftSubmissions} (will be preserved)`)
    console.log(`   TimeEntries (linked to SUBMITTED/APPROVED): ${linkedTimeEntryCount} (will be preserved)`)
    console.log(`   TimeEntries (linked to REJECTED): ${linkedToRejectedCount} (will be DELETED)`)
    console.log(`   TimeEntries (linked to DRAFT): ${preservedLinkedTimeEntryCount} (will be preserved)`)
    console.log(`   TimeEntries (NOT linked - will be preserved): ${unlinkedTimeEntryCount}`)
    console.log(`   Timesheets (attendance - will be preserved): ${timesheetCount}`)
    console.log(`   Users (will be preserved): ${userCount}`)
    console.log(`   Jobs (will be preserved): ${jobCount}`)

    const totalToReset = submittedSubmissions + approvedSubmissions
    const totalToDelete = rejectedSubmissions
    
    if (totalToReset === 0 && totalToDelete === 0) {
      console.log('\n✅ No SUBMITTED/APPROVED/REJECTED timesheet submissions to process')
      return { resetSubmissions: 0, deletedSubmissions: 0, deletedTimeEntries: 0 }
    }

    // Show sample records that will be reset
    if (totalToReset > 0) {
      console.log('\n📋 Sample TimesheetSubmissions to be reset (SUBMITTED/APPROVED):')
      const sampleSubmissions = await prisma.timesheetSubmission.findMany({
        where: {
          status: { in: ['SUBMITTED', 'APPROVED'] }
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userId: true,
          weekStart: true,
          weekEnd: true,
          type: true,
          status: true,
          submittedAt: true,
          approvedAt: true,
          approvedById: true,
          createdAt: true
        }
      })
      sampleSubmissions.forEach((sub, idx) => {
        console.log(`   ${idx + 1}. ID: ${sub.id}`)
        console.log(`      Week: ${sub.weekStart.toISOString().split('T')[0]} to ${sub.weekEnd.toISOString().split('T')[0]}`)
        console.log(`      Type: ${sub.type}, Status: ${sub.status}`)
        console.log(`      Submitted: ${sub.submittedAt ? sub.submittedAt.toISOString() : 'N/A'}`)
        console.log(`      Approved: ${sub.approvedAt ? sub.approvedAt.toISOString() : 'N/A'}`)
      })
    }

    // Show sample records that will be deleted
    if (totalToDelete > 0) {
      console.log('\n📋 Sample TimesheetSubmissions to be DELETED (REJECTED):')
      const sampleRejected = await prisma.timesheetSubmission.findMany({
        where: {
          status: 'REJECTED'
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userId: true,
          weekStart: true,
          weekEnd: true,
          type: true,
          status: true,
          rejectedAt: true,
          rejectionReason: true,
          createdAt: true
        }
      })
      sampleRejected.forEach((sub, idx) => {
        console.log(`   ${idx + 1}. ID: ${sub.id}`)
        console.log(`      Week: ${sub.weekStart.toISOString().split('T')[0]} to ${sub.weekEnd.toISOString().split('T')[0]}`)
        console.log(`      Type: ${sub.type}, Status: ${sub.status}`)
        console.log(`      Rejected: ${sub.rejectedAt ? sub.rejectedAt.toISOString() : 'N/A'}`)
        if (sub.rejectionReason) {
          console.log(`      Reason: ${sub.rejectionReason.substring(0, 50)}...`)
        }
      })
    }

    console.log('\n⚠️  WARNING: This will:')
    console.log('   1. Reset SUBMITTED/APPROVED timesheet submissions to DRAFT')
    console.log('   2. DELETE REJECTED timesheet submissions and their linked TimeEntries')
    console.log('   - TimesheetSubmission records with status SUBMITTED or APPROVED will be reset to DRAFT')
    console.log('   - TimesheetSubmission records with status REJECTED will be DELETED')
    console.log('   - TimeEntry records linked to REJECTED submissions will be DELETED')
    console.log('   - All approval/submission timestamps and IDs will be cleared for reset submissions')
    console.log('   - TimesheetSubmission records with status DRAFT will be preserved as-is')
    console.log('   - All TimeEntry records will be preserved')
    console.log('   - All Timesheet records (attendance) will be preserved')
    console.log('   - All other data (Users, Jobs, etc.) will be preserved\n')

    // Use a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Step 1: Delete TimeEntry records linked to REJECTED submissions
      // This must be done before deleting TimesheetSubmission records
      const deletedTimeEntries = rejectedSubmissionIds.length > 0
        ? await tx.timeEntry.deleteMany({
            where: {
              submissionId: { in: rejectedSubmissionIds }
            }
          })
        : { count: 0 }
      console.log(`✅ Deleted ${deletedTimeEntries.count} TimeEntry records linked to REJECTED submissions`)

      // Step 2: Delete REJECTED TimesheetSubmission records
      const deletedSubmissions = await tx.timesheetSubmission.deleteMany({
        where: {
          status: 'REJECTED'
        }
      })
      console.log(`✅ Deleted ${deletedSubmissions.count} TimesheetSubmission records (REJECTED)`)

      // Step 3: Reset TimesheetSubmission records with status SUBMITTED or APPROVED to DRAFT
      // Clear all approval/submission related fields
      const resetSubmissions = await tx.timesheetSubmission.updateMany({
        where: {
          status: { in: ['SUBMITTED', 'APPROVED'] }
        },
        data: {
          status: 'DRAFT',
          submittedAt: null,
          approvedAt: null,
          approvedById: null,
          rejectedAt: null,
          rejectedById: null,
          rejectionReason: null,
        }
      })
      console.log(`✅ Reset ${resetSubmissions.count} TimesheetSubmission records (SUBMITTED/APPROVED → DRAFT)`)

      return {
        resetSubmissions: resetSubmissions.count,
        deletedSubmissions: deletedSubmissions.count,
        deletedTimeEntries: deletedTimeEntries.count
      }
    })

    console.log('\n🔍 Verifying reset...\n')

    // Verify reset with status breakdown
    const remainingTotalSubmissions = await prisma.timesheetSubmission.count()
    const remainingSubmitted = await prisma.timesheetSubmission.count({
      where: { status: 'SUBMITTED' }
    })
    const remainingApproved = await prisma.timesheetSubmission.count({
      where: { status: 'APPROVED' }
    })
    const remainingRejected = await prisma.timesheetSubmission.count({
      where: { status: 'REJECTED' }
    })
    const remainingDraft = await prisma.timesheetSubmission.count({
      where: { status: 'DRAFT' }
    })

    // Verify TimeEntries are still linked (should be preserved)
    const preservedLinkedTimeEntries = await prisma.timeEntry.count({
      where: {
        submission: {
          status: { in: ['DRAFT', 'REJECTED'] }
        }
      }
    })

    // Verify TimeEntries NOT linked to any submission still exist
    const unlinkedTimeEntries = await prisma.timeEntry.count({
      where: { submissionId: null }
    })

    const preservedTimesheets = await prisma.timesheet.count()
    const preservedUsers = await prisma.user.count()
    const preservedJobs = await prisma.job.count()

    console.log('📊 AFTER Reset - Post-Reset Data Counts:')
    console.log(`   TimesheetSubmissions (total): ${remainingTotalSubmissions} (was: ${totalSubmissions}, deleted: ${result.deletedSubmissions})`)
    console.log(`     - SUBMITTED: ${remainingSubmitted} (expected: 0, was: ${submittedSubmissions})`)
    console.log(`     - APPROVED: ${remainingApproved} (expected: 0, was: ${approvedSubmissions})`)
    console.log(`     - REJECTED: ${remainingRejected} (expected: 0, was: ${rejectedSubmissions}, deleted: ${result.deletedSubmissions})`)
    console.log(`     - DRAFT: ${remainingDraft} (expected: ${draftSubmissions + totalToReset}, was: ${draftSubmissions})`)
    console.log(`   TimeEntries (linked to DRAFT): ${preservedLinkedTimeEntries} (preserved, was: ${preservedLinkedTimeEntryCount + linkedTimeEntryCount})`)
    console.log(`   TimeEntries (NOT linked - preserved): ${unlinkedTimeEntries} (was: ${unlinkedTimeEntryCount})`)
    console.log(`   Timesheets (attendance - preserved): ${preservedTimesheets} (was: ${timesheetCount})`)
    console.log(`   Users (preserved): ${preservedUsers} (was: ${userCount})`)
    console.log(`   Jobs (preserved): ${preservedJobs} (was: ${jobCount})`)

    // Validation
    const allSubmittedApprovedReset = remainingSubmitted === 0 && remainingApproved === 0
    const allRejectedDeleted = remainingRejected === 0 && result.deletedSubmissions === rejectedSubmissions
    const draftCountCorrect = remainingDraft === draftSubmissions + totalToReset
    const linkedEntriesPreserved = preservedLinkedTimeEntries === preservedLinkedTimeEntryCount + linkedTimeEntryCount
    const unlinkedEntriesPreserved = unlinkedTimeEntries === unlinkedTimeEntryCount
    const timesheetsPreserved = preservedTimesheets === timesheetCount
    const usersPreserved = preservedUsers === userCount
    const jobsPreserved = preservedJobs === jobCount
    const totalPreserved = remainingTotalSubmissions === (totalSubmissions - result.deletedSubmissions)

    console.log('\n✅ Reset Summary:')
    console.log(`   Reset ${result.resetSubmissions} TimesheetSubmission records (SUBMITTED/APPROVED → DRAFT)`)
    console.log(`   Deleted ${result.deletedSubmissions} TimesheetSubmission records (REJECTED)`)
    console.log(`   Deleted ${result.deletedTimeEntries} TimeEntry records (linked to REJECTED submissions)`)
    console.log(`   Preserved ${remainingDraft} DRAFT submissions (was ${draftSubmissions}, now includes ${totalToReset} reset submissions)`)
    console.log(`   Preserved ${preservedLinkedTimeEntries} TimeEntry records (linked to submissions)`)
    console.log(`   Preserved ${unlinkedTimeEntries} TimeEntry records (not linked to submissions)`)
    console.log(`   Preserved ${preservedTimesheets} Timesheet records (attendance)`)
    console.log(`   Preserved ${preservedUsers} Users`)
    console.log(`   Preserved ${preservedJobs} Jobs`)

    // Detailed validation results
    const validationResults = []
    if (allSubmittedApprovedReset) {
      validationResults.push('✅ All SUBMITTED/APPROVED submissions reset to DRAFT')
    } else {
      validationResults.push(`⚠️  ${remainingSubmitted + remainingApproved} SUBMITTED/APPROVED submissions still remain`)
    }

    if (allRejectedDeleted) {
      validationResults.push('✅ All REJECTED submissions deleted')
    } else {
      validationResults.push(`⚠️  ${remainingRejected} REJECTED submissions still remain (expected: 0)`)
    }

    if (draftCountCorrect) {
      validationResults.push('✅ DRAFT count is correct (includes reset submissions)')
    } else {
      validationResults.push(`⚠️  DRAFT count is ${remainingDraft}, expected ${draftSubmissions + totalToReset}`)
    }

    if (linkedEntriesPreserved) {
      validationResults.push('✅ TimeEntries linked to submissions preserved')
    } else {
      validationResults.push('⚠️  TimeEntries linked to submissions count changed (unexpected!)')
    }

    if (unlinkedEntriesPreserved) {
      validationResults.push('✅ Unlinked TimeEntries preserved')
    } else {
      validationResults.push('⚠️  Unlinked TimeEntries count changed (unexpected!)')
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

    if (totalPreserved) {
      validationResults.push('✅ Total submission count preserved (no deletions)')
    } else {
      validationResults.push('⚠️  Total submission count changed (unexpected!)')
    }

    console.log('\n📋 Validation Results:')
    validationResults.forEach(result => console.log(`   ${result}`))

    const allValid = allSubmittedApprovedReset && 
                     allRejectedDeleted &&
                     draftCountCorrect && 
                     linkedEntriesPreserved && 
                     unlinkedEntriesPreserved && 
                     timesheetsPreserved && 
                     usersPreserved && 
                     jobsPreserved

    if (allValid) {
      console.log('\n✅ Reset completed successfully!')
      console.log('   All SUBMITTED/APPROVED timesheet submissions have been reset to DRAFT.')
      console.log('   All REJECTED timesheet submissions have been deleted.')
      console.log('   All DRAFT submissions have been preserved.')
    } else {
      console.log('\n⚠️  Reset completed with warnings - please review validation results above')
    }

    return result

  } catch (error) {
    console.error('\n❌ Error during reset:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the reset
if (require.main === module) {
  resetSubmittedApprovedTimesheets()
    .then(() => {
      console.log('\n✅ Script completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error)
      process.exit(1)
    })
}

module.exports = { resetSubmittedApprovedTimesheets }

