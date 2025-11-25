const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function reimportQuotesFromJobs() {
  try {
    console.log('🔄 Starting quote re-import from jobs...\n')
    
    // Find all jobs with type QUOTE
    const quoteJobs = await prisma.job.findMany({
      where: {
        type: 'QUOTE'
      },
      include: {
        customer: true,
        createdBy: true
      }
    })
    
    console.log(`📊 Found ${quoteJobs.length} jobs with type QUOTE`)
    
    if (quoteJobs.length === 0) {
      console.log('⚠️  No quote jobs found. Nothing to import.')
      await prisma.$disconnect()
      return
    }
    
    let imported = 0
    let skipped = 0
    let errors = 0
    
    for (const job of quoteJobs) {
      try {
        // Check if quote already exists
        const existingQuote = await prisma.quote.findUnique({
          where: { quoteNumber: job.jobNumber }
        })
        
        if (existingQuote) {
          console.log(`   ⏭️  Skipping ${job.jobNumber} - already exists`)
          skipped++
          continue
        }
        
        // Create quote from job
        const quoteData = {
          quoteNumber: job.jobNumber,
          title: job.title || `Quote ${job.jobNumber}`,
          description: job.description,
          customerId: job.customerId,
          amount: job.estimatedCost ? Number(job.estimatedCost) : null,
          status: job.status || 'DRAFT',
          quoteType: 'PROJECT',
          isActive: true,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt
        }
        
        await prisma.quote.create({
          data: quoteData
        })
        
        imported++
        
        if (imported % 10 === 0) {
          console.log(`   📊 Imported ${imported}/${quoteJobs.length}...`)
        }
      } catch (error) {
        console.error(`   ❌ Error importing ${job.jobNumber}:`, error.message)
        errors++
      }
    }
    
    console.log('\n✅ Import completed!')
    console.log('='.repeat(50))
    console.log(`📊 Summary:`)
    console.log(`   • Imported: ${imported}`)
    console.log(`   • Skipped (already exists): ${skipped}`)
    console.log(`   • Errors: ${errors}`)
    console.log(`   • Total processed: ${quoteJobs.length}`)
    
    // Show final counts
    const totalQuotes = await prisma.quote.count()
    console.log(`\n📈 Current database status:`)
    console.log(`   • Total quotes: ${totalQuotes}`)
    
    await prisma.$disconnect()
  } catch (error) {
    console.error('\n❌ Error:', error)
    console.error(error.stack)
    await prisma.$disconnect()
    process.exit(1)
  }
}

reimportQuotesFromJobs()


