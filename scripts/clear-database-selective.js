/**
 * Clear selective database tables:
 * DELETE: Customers, Jobs, Quotes, Packages/Assemblies, BOMs
 * KEEP: Users (employees), Parts, LaborCodes
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function clearSelectiveData() {
  try {
    console.log('🗑️  Starting selective database cleanup...\n')

    // Delete in order to respect foreign key constraints
    
    // 1. Delete Time Entries (linked to Jobs)
    console.log('📋 Deleting Time Entries...')
    const timeEntriesCount = await prisma.timeEntry.deleteMany({})
    console.log(`   ✅ Deleted ${timeEntriesCount.count} time entries\n`)

    // 2. Delete BOMParts (linked to BOMs)
    console.log('🔩 Deleting BOM Parts...')
    const bomPartsCount = await prisma.bOMPart.deleteMany({})
    console.log(`   ✅ Deleted ${bomPartsCount.count} BOM parts\n`)

    // 3. Delete BOMs
    console.log('🧱 Deleting BOMs...')
    const bomsCount = await prisma.bOM.deleteMany({})
    console.log(`   ✅ Deleted ${bomsCount.count} BOMs\n`)

    // 4. Delete PackageParts (linked to Packages)
    console.log('📦 Deleting Package Parts...')
    const packagePartsCount = await prisma.packagePart.deleteMany({})
    console.log(`   ✅ Deleted ${packagePartsCount.count} package parts\n`)

    // 5. Delete Packages/Assemblies
    console.log('📦 Deleting Packages/Assemblies...')
    const packagesCount = await prisma.package.deleteMany({})
    console.log(`   ✅ Deleted ${packagesCount.count} packages/assemblies\n`)

    // 6. Delete PartRelations (to clean up relationships)
    console.log('🔗 Deleting Part Relations...')
    const partRelationsCount = await prisma.partRelation.deleteMany({})
    console.log(`   ✅ Deleted ${partRelationsCount.count} part relations\n`)

    // 7. Delete Jobs
    console.log('🔧 Deleting Jobs...')
    const jobsCount = await prisma.job.deleteMany({})
    console.log(`   ✅ Deleted ${jobsCount.count} jobs\n`)

    // 8. Delete Quotes (linked to Customers)
    console.log('🧾 Deleting Quotes...')
    const quotesCount = await prisma.quote.deleteMany({})
    console.log(`   ✅ Deleted ${quotesCount.count} quotes\n`)

    // 9. Delete Contacts (linked to Customers)
    console.log('👤 Deleting Contacts...')
    const contactsCount = await prisma.contact.deleteMany({})
    console.log(`   ✅ Deleted ${contactsCount.count} contacts\n`)

    // 10. Delete Customers
    console.log('🏢 Deleting Customers...')
    const customersCount = await prisma.customer.deleteMany({})
    console.log(`   ✅ Deleted ${customersCount.count} customers\n`)

    // Verify what's left
    console.log('\n' + '='.repeat(60))
    console.log('📊 Database Summary After Cleanup')
    console.log('='.repeat(60))
    
    const [usersCount, partsCount, laborCodesCount] = await Promise.all([
      prisma.user.count(),
      prisma.part.count(),
      prisma.laborCode.count(),
    ])

    console.log(`\n✅ PRESERVED DATA:`)
    console.log(`   👥 Users (Employees): ${usersCount}`)
    console.log(`   🔩 Parts: ${partsCount}`)
    console.log(`   📋 Labor Codes: ${laborCodesCount}`)

    console.log(`\n✅ CLEARED DATA:`)
    console.log(`   🏢 Customers: ${customersCount.count}`)
    console.log(`   👤 Contacts: ${contactsCount.count}`)
    console.log(`   🧾 Quotes: ${quotesCount.count}`)
    console.log(`   🔧 Jobs: ${jobsCount.count}`)
    console.log(`   📦 Packages/Assemblies: ${packagesCount.count}`)
    console.log(`   🧱 BOMs: ${bomsCount.count}`)
    console.log(`   ⏱️  Time Entries: ${timeEntriesCount.count}`)
    console.log(`   🔗 Part Relations: ${partRelationsCount.count}`)

    console.log('\n' + '='.repeat(60))
    console.log('✨ Cleanup completed successfully!')
    console.log('='.repeat(60) + '\n')

  } catch (error) {
    console.error('\n❌ Error during cleanup:', error)
    console.error('Stack:', error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

clearSelectiveData()
