const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function clearAllSubmittedSubmissions() {
  try {
    console.log('🔍 Finding all timesheet submissions (TIME and ATTENDANCE) that are not DRAFT...')
    
    // Find all submissions that are not DRAFT (SUBMITTED, APPROVED, REJECTED)
    const submissions = await prisma.timesheetSubmission.findMany({
      where: {
        status: { not: 'DRAFT' }
      },
      include: {
        timeEntries: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        weekStart: 'desc'
      }
    })

    console.log(`📊 Found ${submissions.length} non-DRAFT submissions`)

    if (submissions.length === 0) {
      console.log('✅ No submissions to clear (all are DRAFT or none exist)')
      return
    }

    // Group by type and status
    const byType = submissions.reduce((acc, sub) => {
      const key = `${sub.type}-${sub.status}`
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
    console.log('📈 Breakdown by type and status:', byType)

    // Show what will be deleted
    console.log('\n📋 Submissions to be deleted:')
    submissions.forEach((sub, index) => {
      const userName = sub.user?.name || sub.user?.email || sub.userId
      const weekStart = sub.weekStart.toISOString().split('T')[0]
      console.log(`  ${index + 1}. ${userName} - Type: ${sub.type}, Status: ${sub.status}, Week: ${weekStart}, Time Entries: ${sub.timeEntries.length}`)
    })

    // Delete in a transaction
    console.log('\n🗑️  Deleting submissions and associated time entries...')
    
    const result = await prisma.$transaction(async (tx) => {
      let deletedSubmissions = 0
      let deletedTimeEntries = 0

      for (const submission of submissions) {
        // Delete associated time entries first (if any)
        if (submission.timeEntries.length > 0) {
          const deletedEntries = await tx.timeEntry.deleteMany({
            where: {
              submissionId: submission.id
            }
          })
          deletedTimeEntries += deletedEntries.count
        }

        // Delete the submission
        await tx.timesheetSubmission.delete({
          where: {
            id: submission.id
          }
        })
        deletedSubmissions++
      }

      return { deletedSubmissions, deletedTimeEntries }
    })

    console.log(`\n✅ Successfully cleared ${result.deletedSubmissions} submissions`)
    console.log(`✅ Deleted ${result.deletedTimeEntries} associated time entries`)
    console.log('\n✨ Done!')

  } catch (error) {
    console.error('❌ Error clearing submitted submissions:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
clearAllSubmittedSubmissions()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })

