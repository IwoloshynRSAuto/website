/**
 * Migrate existing BOM statuses from old enum (QUOTE, ASSEMBLY) to new enum (ACTIVE, ARCHIVED)
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function migrateBOMStatuses() {
  try {
    console.log('🔄 Migrating BOM statuses...\n')

    // Get all BOMs with old status values
    const bomsWithOldStatus = await prisma.$queryRaw`
      SELECT id, status FROM boms WHERE status IN ('QUOTE', 'ASSEMBLY')
    `

    console.log(`Found ${bomsWithOldStatus.length} BOMs with old status values\n`)

    for (const bom of bomsWithOldStatus) {
      let newStatus = 'ACTIVE'
      
      // Convert old statuses to new ones
      if (bom.status === 'QUOTE') {
        newStatus = 'ACTIVE' // Quotes become active BOMs
      } else if (bom.status === 'ASSEMBLY') {
        newStatus = 'ACTIVE' // Assemblies become active BOMs
      }

      // Update the status using raw SQL since Prisma might not allow old enum values
      await prisma.$executeRaw`
        UPDATE boms SET status = ${newStatus} WHERE id = ${bom.id}
      `

      console.log(`✅ Updated BOM ${bom.id}: ${bom.status} → ${newStatus}`)
    }

    console.log(`\n✅ Migration complete! Updated ${bomsWithOldStatus.length} BOMs\n`)

  } catch (error) {
    console.error('❌ Error migrating BOM statuses:', error)
  } finally {
    await prisma.$disconnect()
  }
}

migrateBOMStatuses()

