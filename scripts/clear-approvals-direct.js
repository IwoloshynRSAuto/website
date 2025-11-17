/**
 * Clear all timesheet approvals - Direct database script
 * Run with: node -r dotenv/config scripts/clear-approvals-direct.js
 * Or set DATABASE_URL environment variable
 */

// This script uses the lib/prisma.ts instance
// Run from project root: node --loader ts-node/esm scripts/clear-approvals-direct.mjs
// Or use the API endpoint instead: DELETE /api/admin/clear-approvals

console.log(`
To clear all approvals, you have two options:

1. Use the API endpoint (recommended):
   - Make sure the server is running
   - As an ADMIN user, call: DELETE /api/admin/clear-approvals
   - Or use curl: curl -X DELETE http://localhost:3000/api/admin/clear-approvals

2. Run this script directly (requires DATABASE_URL):
   - Set DATABASE_URL environment variable
   - Run: node scripts/clear-approvals-direct.js
`)

// If DATABASE_URL is set, we can run directly
if (process.env.DATABASE_URL) {
  const { PrismaClient } = require('@prisma/client')
  const prisma = new PrismaClient()

  async function clearApprovals() {
    try {
      console.log('Clearing all timesheet approvals...')
      
      const deleteResult = await prisma.timesheetSubmission.deleteMany({
        where: {
          status: {
            in: ['SUBMITTED', 'APPROVED', 'REJECTED']
          }
        }
      })

      console.log(`✅ Deleted ${deleteResult.count} timesheet submissions`)
      
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

      console.log(`✅ Reset ${resetResult.count} DRAFT submissions`)
      console.log('All approvals cleared!')
      
    } catch (error) {
      console.error('Error:', error)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
    }
  }

  clearApprovals()
} else {
  console.log('DATABASE_URL not set. Please use the API endpoint instead.')
}

