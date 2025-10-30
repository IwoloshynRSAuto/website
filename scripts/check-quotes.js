const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkQuotes() {
  try {
    console.log('📋 Checking existing quotes...\n')

    const quotes = await prisma.quote.findMany({
      include: {
        customer: true,
        job: true,
        laborItems: true
      },
      orderBy: { quoteNumber: 'desc' },
      take: 10
    })

    if (quotes.length === 0) {
      console.log('❌ No quotes found in database')
    } else {
      console.log(`✅ Found ${quotes.length} quotes:`)
      quotes.forEach(quote => {
        console.log(`   - ${quote.quoteNumber}: ${quote.title} (${quote.customer.name}) - $${quote.amount}`)
      })
    }

    // Check if we can create a test quote
    console.log('\n🧪 Creating test quote Q0611...')
    
    const customers = await prisma.customer.findMany({ take: 1 })
    if (customers.length === 0) {
      console.log('❌ No customers found, cannot create test quote')
      return
    }

    const testQuote = await prisma.quote.create({
      data: {
        quoteNumber: 'Q0611',
        title: 'Test Quote for Functionality',
        description: 'This is a test quote to verify edit, view, and convert functionality',
        customerId: customers[0].id,
        amount: 5000.00,
        status: 'DRAFT',
        paymentTerms: 'Net 30',
        estimatedHours: 40,
        hourlyRate: 125.00,
        laborCost: 5000.00,
        customerContactName: 'Test Contact',
        customerContactEmail: 'test@example.com',
        customerContactPhone: '555-0123',
        laborItems: {
          create: [
            {
              description: 'System Design and Architecture',
              category: 'Design',
              hours: 20,
              hourlyRate: 125.00,
              totalCost: 2500.00
            },
            {
              description: 'Implementation and Testing',
              category: 'Development',
              hours: 20,
              hourlyRate: 125.00,
              totalCost: 2500.00
            }
          ]
        }
      },
      include: {
        customer: true,
        laborItems: true
      }
    })

    console.log('✅ Test quote Q0611 created successfully!')
    console.log(`   - ID: ${testQuote.id}`)
    console.log(`   - Title: ${testQuote.title}`)
    console.log(`   - Customer: ${testQuote.customer.name}`)
    console.log(`   - Amount: $${testQuote.amount}`)
    console.log(`   - Labor Items: ${testQuote.laborItems.length}`)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkQuotes()




