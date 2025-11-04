const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixStatuses() {
  try {
    // Update any invalid statuses to valid ones
    // SQLite doesn't enforce enum constraints, so we need to fix invalid values
    
    // Update QUOTE -> ACTIVE
    await prisma.$executeRaw`
      UPDATE boms SET status = 'ACTIVE' WHERE status = 'QUOTE'
    `
    
    // Update ASSEMBLY -> ACTIVE  
    await prisma.$executeRaw`
      UPDATE boms SET status = 'ACTIVE' WHERE status = 'ASSEMBLY'
    `
    
    // Update any other invalid statuses to DRAFT
    await prisma.$executeRaw`
      UPDATE boms 
      SET status = 'DRAFT' 
      WHERE status NOT IN ('DRAFT', 'ACTIVE', 'ARCHIVED')
    `
    
    console.log('✅ Fixed BOM statuses')
    
    // Verify
    const boms = await prisma.bOM.findMany({
      select: {
        id: true,
        name: true,
        status: true,
      },
    })
    
    console.log(`\nBOMs after fix:`)
    boms.forEach(bom => {
      console.log(`- ${bom.name}: ${bom.status}`)
    })
    
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

fixStatuses()

