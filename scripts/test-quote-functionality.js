const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testQuoteFunctionality() {
  try {
    console.log('🧪 Testing Quote Functionality...\n')

    // 1. Check if Q0611 exists
    console.log('1. Checking for Q0611 quote...')
    const q0611 = await prisma.quote.findFirst({
      where: { quoteNumber: 'Q0611' },
      include: {
        customer: true,
        job: true,
        laborItems: true
      }
    })

    if (q0611) {
      console.log('✅ Q0611 found:')
      console.log(`   - Title: ${q0611.title}`)
      console.log(`   - Customer: ${q0611.customer.name}`)
      console.log(`   - Status: ${q0611.status}`)
      console.log(`   - Amount: $${q0611.amount}`)
      console.log(`   - Labor Items: ${q0611.laborItems.length}`)
      console.log(`   - Linked Job: ${q0611.job ? q0611.job.jobNumber : 'None'}`)
    } else {
      console.log('❌ Q0611 not found')
    }

    // 2. Test API endpoints
    console.log('\n2. Testing API endpoints...')
    
    // Test GET /api/quotes/[id]
    if (q0611) {
      try {
        const response = await fetch(`http://localhost:3000/api/quotes/${q0611.id}`)
        if (response.ok) {
          const data = await response.json()
          console.log('✅ GET /api/quotes/[id] works')
          console.log(`   - Retrieved quote: ${data.quoteNumber}`)
        } else {
          console.log('❌ GET /api/quotes/[id] failed:', response.status)
        }
      } catch (error) {
        console.log('❌ GET /api/quotes/[id] error:', error.message)
      }
    }

    // 3. Test job creation for conversion
    console.log('\n3. Testing job creation...')
    if (q0611 && q0611.status === 'ACCEPTED' && !q0611.job) {
      try {
        const jobData = {
          jobNumber: 'J0611', // Convert Q0611 to J0611
          title: q0611.title,
          description: q0611.description,
          customerId: q0611.customerId,
          quoteId: q0611.id,
          quotedAmount: Number(q0611.amount),
          priority: 'MEDIUM'
        }

        const response = await fetch('http://localhost:3000/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(jobData)
        })

        if (response.ok) {
          const job = await response.json()
          console.log('✅ Job creation works')
          console.log(`   - Created job: ${job.jobNumber}`)
        } else {
          const error = await response.json()
          console.log('❌ Job creation failed:', error.error)
        }
      } catch (error) {
        console.log('❌ Job creation error:', error.message)
      }
    } else if (q0611 && q0611.job) {
      console.log('✅ Quote already has linked job:', q0611.job.jobNumber)
    } else if (q0611 && q0611.status !== 'ACCEPTED') {
      console.log('⚠️  Quote status is not ACCEPTED, cannot convert to job')
    }

    // 4. Test quote update
    console.log('\n4. Testing quote update...')
    if (q0611) {
      try {
        const updateData = {
          id: q0611.id,
          quoteNumber: q0611.quoteNumber,
          title: q0611.title + ' (Updated)',
          description: q0611.description,
          customerId: q0611.customerId,
          jobId: q0611.jobId,
          amount: Number(q0611.amount),
          validUntil: q0611.validUntil,
          paymentTerms: q0611.paymentTerms,
          depositAmount: q0611.depositAmount ? Number(q0611.depositAmount) : null,
          estimatedHours: q0611.estimatedHours,
          hourlyRate: q0611.hourlyRate ? Number(q0611.hourlyRate) : null,
          materialCost: q0611.materialCost ? Number(q0611.materialCost) : null,
          overheadCost: q0611.overheadCost ? Number(q0611.overheadCost) : null,
          profitMargin: q0611.profitMargin ? Number(q0611.profitMargin) : null,
          laborCost: q0611.laborCost ? Number(q0611.laborCost) : null,
          customerContactName: q0611.customerContactName,
          customerContactEmail: q0611.customerContactEmail,
          customerContactPhone: q0611.customerContactPhone,
          laborItems: q0611.laborItems.map(item => ({
            description: item.description,
            category: item.category,
            hours: item.hours,
            hourlyRate: Number(item.hourlyRate),
            totalCost: Number(item.totalCost)
          }))
        }

        const response = await fetch('http://localhost:3000/api/quotes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        })

        if (response.ok) {
          const updatedQuote = await response.json()
          console.log('✅ Quote update works')
          console.log(`   - Updated title: ${updatedQuote.title}`)
        } else {
          const error = await response.json()
          console.log('❌ Quote update failed:', error.error)
        }
      } catch (error) {
        console.log('❌ Quote update error:', error.message)
      }
    }

    console.log('\n🎉 Quote functionality test completed!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testQuoteFunctionality()




