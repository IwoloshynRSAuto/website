const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkStatuses() {
  try {
    // Use raw query to see what's actually in the database
    const statuses = await prisma.$queryRaw`
      SELECT DISTINCT status FROM boms
    `
    console.log('Statuses in database:', statuses)
    
    // Get all BOMs
    const boms = await prisma.bOM.findMany({
      select: {
        id: true,
        name: true,
        status: true,
      },
    })
    
    console.log(`\nTotal BOMs: ${boms.length}`)
    boms.forEach(bom => {
      console.log(`- ${bom.name}: ${bom.status}`)
    })
    
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkStatuses()

