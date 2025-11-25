const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding eBay settings with default values...')

  // Seed Categories
  const defaultCategories = [
    'Electronics',
    'Industrial Equipment',
    'Automation Components',
    'Electrical Components',
    'Mechanical Parts',
    'Tools',
    'Test Equipment',
    'Other'
  ]

  for (const name of defaultCategories) {
    await prisma.ebayCategory.upsert({
      where: { name },
      update: {},
      create: {
        name,
        isActive: true
      }
    })
  }
  console.log(`✅ Created/updated ${defaultCategories.length} categories`)

  // Seed Storage Locations
  const defaultLocations = [
    'Warehouse A',
    'Warehouse B',
    'Storage Room 1',
    'Storage Room 2',
    'Main Floor',
    'Basement',
    'Shipping Area',
    'Test Area'
  ]

  for (const name of defaultLocations) {
    await prisma.ebayStorageLocation.upsert({
      where: { name },
      update: {},
      create: {
        name,
        isActive: true
      }
    })
  }
  console.log(`✅ Created/updated ${defaultLocations.length} storage locations`)

  // Seed Conditions
  const defaultConditions = [
    'New',
    'Like New',
    'Used - Excellent',
    'Used - Good',
    'Used - Fair',
    'For Parts',
    'Not Working',
    'Refurbished'
  ]

  for (const name of defaultConditions) {
    await prisma.ebayCondition.upsert({
      where: { name },
      update: {},
      create: {
        name,
        isActive: true
      }
    })
  }
  console.log(`✅ Created/updated ${defaultConditions.length} conditions`)

  // Seed Test Statuses
  const defaultTestStatuses = [
    'Needs Testing',
    'Tested Working',
    'Tested - Partial Function',
    'Needs Repair',
    'Not Tested',
    'Tested - Not Working',
    'Passed All Tests',
    'Failed Testing'
  ]

  for (const name of defaultTestStatuses) {
    await prisma.ebayTestStatus.upsert({
      where: { name },
      update: {},
      create: {
        name,
        isActive: true
      }
    })
  }
  console.log(`✅ Created/updated ${defaultTestStatuses.length} test statuses`)

  console.log('✨ Seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

