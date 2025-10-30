const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testProjectsImport() {
  try {
    console.log('🧪 Testing Projects Import Results...\n')

    // Test 1: Check total jobs imported
    const totalJobs = await prisma.job.count()
    console.log(`📊 Total jobs in database: ${totalJobs}`)

    // Test 2: Check jobs with new CSV fields
    const jobsWithNewFields = await prisma.job.findMany({
      where: {
        OR: [
          { inQuickBooks: true },
          { inLDrive: true },
          { invoiced: true },
          { quoteNumber: { not: null } },
          { customerContact: { not: null } }
        ]
      },
      take: 10,
      select: {
        jobNumber: true,
        title: true,
        inQuickBooks: true,
        inLDrive: true,
        invoiced: true,
        quoteNumber: true,
        customerContact: true,
        customer: {
          select: { name: true }
        }
      }
    })

    console.log('\n🔍 Sample jobs with new CSV fields:')
    jobsWithNewFields.forEach(job => {
      console.log(`   ${job.jobNumber}: ${job.title}`)
      console.log(`     Customer: ${job.customer.name}`)
      console.log(`     Contact: ${job.customerContact || 'N/A'}`)
      console.log(`     QB: ${job.inQuickBooks ? 'Yes' : 'No'}, LDrive: ${job.inLDrive ? 'Yes' : 'No'}`)
      console.log(`     Invoiced: ${job.invoiced ? 'Yes' : 'No'}, Quote: ${job.quoteNumber || 'N/A'}`)
      console.log('')
    })

    // Test 3: Check status distribution
    const statusCounts = await prisma.job.groupBy({
      by: ['status'],
      _count: { status: true }
    })

    console.log('📈 Job Status Distribution:')
    statusCounts.forEach(status => {
      console.log(`   ${status.status}: ${status._count.status} jobs`)
    })

    // Test 4: Check customers created
    const totalCustomers = await prisma.customer.count()
    console.log(`\n👥 Total customers: ${totalCustomers}`)

    // Test 5: Check users created
    const totalUsers = await prisma.user.count()
    console.log(`👤 Total users: ${totalUsers}`)

    // Test 6: Check quotes created
    const totalQuotes = await prisma.quote.count()
    console.log(`📋 Total quotes: ${totalQuotes}`)

    // Test 7: Check jobs with associated quotes
    const jobsWithQuotes = await prisma.job.count({
      where: { quoteNumber: { not: null } }
    })
    console.log(`🔗 Jobs with quote numbers: ${jobsWithQuotes}`)

    // Test 8: Check invoiced jobs
    const invoicedJobs = await prisma.job.count({
      where: { invoiced: true }
    })
    console.log(`💰 Invoiced jobs: ${invoicedJobs}`)

    // Test 9: Check QuickBooks jobs
    const qbJobs = await prisma.job.count({
      where: { inQuickBooks: true }
    })
    console.log(`📊 Jobs in QuickBooks: ${qbJobs}`)

    // Test 10: Check L Drive jobs
    const lDriveJobs = await prisma.job.count({
      where: { inLDrive: true }
    })
    console.log(`💾 Jobs in L Drive: ${lDriveJobs}`)

    console.log('\n✅ All tests completed successfully!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
if (require.main === module) {
  testProjectsImport()
}

module.exports = { testProjectsImport }



