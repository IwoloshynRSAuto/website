const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function clearDatabases() {
  try {
    console.log('Starting database cleanup...')

    // Delete in order to respect foreign key constraints
    
    // 1. Delete TimeEntries (reference Jobs)
    console.log('Deleting TimeEntries...')
    const timeEntriesDeleted = await prisma.timeEntry.deleteMany({})
    console.log(`Deleted ${timeEntriesDeleted.count} time entries`)

    // 2. Delete EngineeringChangeOrders (reference Jobs, cascade but being explicit)
    console.log('Deleting EngineeringChangeOrders...')
    const ecoDeleted = await prisma.engineeringChangeOrder.deleteMany({})
    console.log(`Deleted ${ecoDeleted.count} engineering change orders`)

    // 3. Delete JobLaborEstimates (reference Jobs, cascade but being explicit)
    console.log('Deleting JobLaborEstimates...')
    const jobLaborDeleted = await prisma.jobLaborEstimate.deleteMany({})
    console.log(`Deleted ${jobLaborDeleted.count} job labor estimates`)

    // 4. Delete Jobs (may have quoteId references, but those are optional)
    console.log('Deleting Jobs...')
    const jobsDeleted = await prisma.job.deleteMany({})
    console.log(`Deleted ${jobsDeleted.count} jobs`)

    // 5. Delete Quotes (reference Customers)
    console.log('Deleting Quotes...')
    const quotesDeleted = await prisma.quote.deleteMany({})
    console.log(`Deleted ${quotesDeleted.count} quotes`)

    // 6. Delete Contacts (reference Customers)
    console.log('Deleting Contacts...')
    const contactsDeleted = await prisma.contact.deleteMany({})
    console.log(`Deleted ${contactsDeleted.count} contacts`)

    // 7. Delete Customers
    console.log('Deleting Customers...')
    const customersDeleted = await prisma.customer.deleteMany({})
    console.log(`Deleted ${customersDeleted.count} customers`)

    // 8. Delete PartsService (standalone, no foreign keys)
    console.log('Deleting PartsService...')
    const partsServicesDeleted = await prisma.partsService.deleteMany({})
    console.log(`Deleted ${partsServicesDeleted.count} parts/services`)

    console.log('\n✅ Database cleanup completed successfully!')
    console.log('\nSummary:')
    console.log(`  - TimeEntries: ${timeEntriesDeleted.count}`)
    console.log(`  - EngineeringChangeOrders: ${ecoDeleted.count}`)
    console.log(`  - JobLaborEstimates: ${jobLaborDeleted.count}`)
    console.log(`  - Jobs: ${jobsDeleted.count}`)
    console.log(`  - Quotes: ${quotesDeleted.count}`)
    console.log(`  - Contacts: ${contactsDeleted.count}`)
    console.log(`  - Customers: ${customersDeleted.count}`)
    console.log(`  - PartsServices: ${partsServicesDeleted.count}`)

  } catch (error) {
    console.error('❌ Error clearing databases:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

clearDatabases()

