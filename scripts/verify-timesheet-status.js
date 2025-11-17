/**
 * Verification Script for Timesheet Submission Status
 * 
 * This script provides verification queries to check the status of timesheet submissions
 * before and after resetting SUBMITTED/APPROVED submissions to DRAFT.
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function verifyTimesheetStatus() {
  try {
    console.log('🔍 Timesheet Submission Status Verification\n')

    // Count by status
    const statusCounts = await prisma.timesheetSubmission.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    })

    console.log('📊 TimesheetSubmission Counts by Status:')
    statusCounts.forEach(item => {
      console.log(`   ${item.status}: ${item._count.id}`)
    })

    const totalSubmissions = await prisma.timesheetSubmission.count()
    console.log(`\n   Total: ${totalSubmissions}`)

    // Count SUBMITTED/APPROVED
    const submittedApproved = await prisma.timesheetSubmission.count({
      where: {
        status: { in: ['SUBMITTED', 'APPROVED'] }
      }
    })

    console.log(`\n📋 SUBMITTED/APPROVED Count: ${submittedApproved}`)
    if (submittedApproved === 0) {
      console.log('   ✅ No SUBMITTED/APPROVED submissions found')
    } else {
      console.log(`   ⚠️  ${submittedApproved} SUBMITTED/APPROVED submissions need to be reset`)
    }

    // Check for submissions with cleared fields but wrong status
    const draftWithApprovalData = await prisma.timesheetSubmission.count({
      where: {
        status: 'DRAFT',
        OR: [
          { submittedAt: { not: null } },
          { approvedAt: { not: null } },
          { approvedById: { not: null } },
          { rejectedAt: { not: null } },
          { rejectedById: { not: null } },
          { rejectionReason: { not: null } }
        ]
      }
    })

    if (draftWithApprovalData > 0) {
      console.log(`\n⚠️  Found ${draftWithApprovalData} DRAFT submissions with approval/submission data`)
      console.log('   These may need to be cleaned up')
    } else {
      console.log('\n✅ All DRAFT submissions have clean approval/submission fields')
    }

    // Count TimeEntries
    const totalTimeEntries = await prisma.timeEntry.count()
    const linkedTimeEntries = await prisma.timeEntry.count({
      where: {
        submissionId: { not: null }
      }
    })
    const unlinkedTimeEntries = await prisma.timeEntry.count({
      where: {
        submissionId: null
      }
    })

    console.log('\n📊 TimeEntry Counts:')
    console.log(`   Total: ${totalTimeEntries}`)
    console.log(`   Linked to submissions: ${linkedTimeEntries}`)
    console.log(`   Not linked: ${unlinkedTimeEntries}`)

    // Count other data
    const timesheetCount = await prisma.timesheet.count()
    const userCount = await prisma.user.count()
    const jobCount = await prisma.job.count()

    console.log('\n📊 Other Data Counts:')
    console.log(`   Timesheets (attendance): ${timesheetCount}`)
    console.log(`   Users: ${userCount}`)
    console.log(`   Jobs: ${jobCount}`)

    // Sample SUBMITTED/APPROVED submissions
    if (submittedApproved > 0) {
      console.log('\n📋 Sample SUBMITTED/APPROVED Submissions:')
      const samples = await prisma.timesheetSubmission.findMany({
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
          approvedById: true
        }
      })

      samples.forEach((sub, idx) => {
        console.log(`   ${idx + 1}. ID: ${sub.id}`)
        console.log(`      Week: ${sub.weekStart.toISOString().split('T')[0]} to ${sub.weekEnd.toISOString().split('T')[0]}`)
        console.log(`      Type: ${sub.type}, Status: ${sub.status}`)
        if (sub.submittedAt) {
          console.log(`      Submitted: ${sub.submittedAt.toISOString()}`)
        }
        if (sub.approvedAt) {
          console.log(`      Approved: ${sub.approvedAt.toISOString()}`)
        }
      })
    }

    console.log('\n✅ Verification complete')

  } catch (error) {
    console.error('\n❌ Error during verification:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run verification
if (require.main === module) {
  verifyTimesheetStatus()
    .then(() => {
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Verification failed:', error)
      process.exit(1)
    })
}

module.exports = { verifyTimesheetStatus }

