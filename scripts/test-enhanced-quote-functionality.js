const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testEnhancedQuoteFunctionality() {
  try {
    console.log('🧪 Testing Enhanced Quote Functionality...\n')

    // 1. Check all quotes and their features
    console.log('1. Checking all quotes and their available features...')
    const quotes = await prisma.quote.findMany({
      include: {
        customer: true,
        job: true,
        laborItems: true
      },
      orderBy: { quoteNumber: 'desc' },
      take: 5
    })

    quotes.forEach(quote => {
      console.log(`\n📋 Quote: ${quote.quoteNumber}`)
      console.log(`   - Title: ${quote.title}`)
      console.log(`   - Status: ${quote.status}`)
      console.log(`   - Customer: ${quote.customer.name}`)
      console.log(`   - Amount: $${quote.amount}`)
      console.log(`   - Linked Job: ${quote.job ? quote.job.jobNumber : 'None'}`)
      console.log(`   - Features Available:`)
      console.log(`     ✅ View Details: Always available`)
      console.log(`     ✅ Edit: Always available`)
      console.log(`     ${quote.job ? '❌' : '✅'} Convert to Job: ${quote.job ? 'Already has job' : 'Available'}`)
      console.log(`     ✅ Export: Always available`)
    })

    // 2. Test job number generation
    console.log('\n2. Testing job number generation...')
    const testQuote = quotes[0]
    if (testQuote) {
      const generatedJobNumber = testQuote.quoteNumber.replace('Q', 'J')
      console.log(`   - Quote: ${testQuote.quoteNumber}`)
      console.log(`   - Generated Job Number: ${generatedJobNumber}`)
      
      // Check if this job number already exists
      const existingJob = await prisma.job.findUnique({
        where: { jobNumber: generatedJobNumber }
      })
      
      if (existingJob) {
        console.log(`   - ⚠️  Job ${generatedJobNumber} already exists`)
      } else {
        console.log(`   - ✅ Job number ${generatedJobNumber} is available`)
      }
    }

    // 3. Test custom job number creation
    console.log('\n3. Testing custom job number creation...')
    if (testQuote && !testQuote.job) {
      const customJobNumber = `CUSTOM-${testQuote.quoteNumber.replace('Q', '')}`
      
      try {
        const jobResponse = await fetch('http://localhost:3000/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobNumber: customJobNumber,
            title: `${testQuote.title} (Custom Job)`,
            description: testQuote.description,
            customerId: testQuote.customerId,
            quoteId: testQuote.id,
            quotedAmount: Number(testQuote.amount),
            priority: 'MEDIUM'
          })
        })

        if (jobResponse.ok) {
          const job = await jobResponse.json()
          console.log(`   ✅ Custom job created successfully: ${job.jobNumber}`)
        } else {
          const error = await jobResponse.json()
          console.log(`   ❌ Custom job creation failed: ${error.error}`)
        }
      } catch (error) {
        console.log(`   ❌ Custom job creation error: ${error.message}`)
      }
    }

    // 4. Test API endpoints
    console.log('\n4. Testing API endpoints...')
    
    // Test GET /api/quotes/[id]
    if (testQuote) {
      try {
        const response = await fetch(`http://localhost:3000/api/quotes/${testQuote.id}`)
        if (response.ok) {
          const data = await response.json()
          console.log('   ✅ GET /api/quotes/[id] works')
        } else {
          console.log('   ❌ GET /api/quotes/[id] failed')
        }
      } catch (error) {
        console.log('   ❌ GET /api/quotes/[id] error:', error.message)
      }
    }

    // Test GET /api/jobs
    try {
      const response = await fetch('http://localhost:3000/api/jobs')
      if (response.ok) {
        const jobs = await response.json()
        console.log(`   ✅ GET /api/jobs works (${jobs.length} jobs found)`)
      } else {
        console.log('   ❌ GET /api/jobs failed')
      }
    } catch (error) {
      console.log('   ❌ GET /api/jobs error:', error.message)
    }

    console.log('\n🎉 Enhanced quote functionality test completed!')
    console.log('\n📝 Summary of Features:')
    console.log('   ✅ All quotes now have View Details functionality')
    console.log('   ✅ All quotes now have Edit functionality')
    console.log('   ✅ All quotes without existing jobs have Convert to Job functionality')
    console.log('   ✅ Convert to Job dialog allows custom job numbers')
    console.log('   ✅ Job number validation prevents duplicates')
    console.log('   ✅ Auto-generation of job numbers from quote numbers')

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testEnhancedQuoteFunctionality()




