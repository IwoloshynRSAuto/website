const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function updateQuoteStatus() {
  try {
    console.log('🔄 Updating Q0611 status to ACCEPTED...\n')

    const updatedQuote = await prisma.quote.update({
      where: { quoteNumber: 'Q0611' },
      data: { status: 'ACCEPTED' },
      include: {
        customer: true,
        job: true
      }
    })

    console.log('✅ Quote status updated successfully!')
    console.log(`   - Quote: ${updatedQuote.quoteNumber}`)
    console.log(`   - Status: ${updatedQuote.status}`)
    console.log(`   - Customer: ${updatedQuote.customer.name}`)
    console.log(`   - Linked Job: ${updatedQuote.job ? updatedQuote.job.jobNumber : 'None'}`)

  } catch (error) {
    console.error('❌ Error updating quote status:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateQuoteStatus()




