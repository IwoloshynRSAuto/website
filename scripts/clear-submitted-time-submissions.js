const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function clearSubmittedTimeSubmissions() {
  try {
    console.log('🔍 Finding all TIME submissions...')
    
    // Find all TIME submissions (any status)
    const submissions = await prisma.timesheetSubmission.findMany({
      where: {
        type: 'TIME'
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

    console.log(`📊 Found ${submissions.length} TIME submissions (all statuses)`)
    
    // Group by status
    const byStatus = submissions.reduce((acc, sub) => {
      acc[sub.status] = (acc[sub.status] || 0) + 1
      return acc
    }, {})
    console.log('📈 Status breakdown:', byStatus)

    if (submissions.length === 0) {
      console.log('✅ No submitted TIME submissions to clear')
      return
    }

    // Show what will be deleted
    console.log('\n📋 Submissions to be deleted:')
    submissions.forEach((sub, index) => {
      const userName = sub.user?.name || sub.user?.email || sub.userId
      const weekStart = sub.weekStart.toISOString().split('T')[0]
      console.log(`  ${index + 1}. ${userName} - Week: ${weekStart}, Status: ${sub.status}, Time Entries: ${sub.timeEntries.length}`)
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

    console.log(`\n✅ Successfully cleared ${result.deletedSubmissions} TIME submissions`)
    console.log(`✅ Deleted ${result.deletedTimeEntries} associated time entries`)
    console.log('\n✨ Done!')

  } catch (error) {
    console.error('❌ Error clearing submitted TIME submissions:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
clearSubmittedTimeSubmissions()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })

