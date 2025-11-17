/**
 * Clear all timesheet approvals
 * This script will delete all timesheet submissions that are SUBMITTED, APPROVED, or REJECTED
 * Use with caution - this is a destructive operation
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function clearApprovals() {
  try {
    console.log('🗑️  Clearing all timesheet approvals...')
    
    // Delete all submissions that are not DRAFT
    const deleteResult = await prisma.timesheetSubmission.deleteMany({
      where: {
        status: {
          in: ['SUBMITTED', 'APPROVED', 'REJECTED']
        }
      }
    })

    console.log(`✅ Deleted ${deleteResult.count} timesheet submissions`)
    
    // Also reset any DRAFT submissions that have approval/rejection data
    const resetResult = await prisma.timesheetSubmission.updateMany({
      where: {
        status: 'DRAFT',
        OR: [
          { approvedAt: { not: null } },
          { rejectedAt: { not: null } },
          { approvedById: { not: null } },
          { rejectedById: { not: null } }
        ]
      },
      data: {
        approvedAt: null,
        approvedById: null,
        rejectedAt: null,
        rejectedById: null,
        rejectionReason: null,
        submittedAt: null,
      }
    })

    console.log(`✅ Reset ${resetResult.count} DRAFT submissions with approval data`)
    console.log('🎉 All approvals have been cleared!')
    
  } catch (error) {
    console.error('❌ Error clearing approvals:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

clearApprovals()

