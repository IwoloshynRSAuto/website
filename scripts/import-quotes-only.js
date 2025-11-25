const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function importQuotesOnly() {
  try {
    const backupFile = process.argv[2] || 'backup-2025-11-04.json'
    
    if (!fs.existsSync(backupFile)) {
      console.error(`❌ Backup file not found: ${backupFile}`)
      process.exit(1)
    }
    
    console.log(`📥 Loading backup file: ${backupFile}`)
    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'))
    
    if (!backupData.quotes || backupData.quotes.length === 0) {
      console.log('⚠️  No quotes found in backup file')
      await prisma.$disconnect()
      return
    }
    
    console.log(`📊 Found ${backupData.quotes.length} quotes in backup\n`)
    
    let imported = 0
    let skipped = 0
    let errors = 0
    
    for (const quote of backupData.quotes) {
      try {
        // Check if quote already exists
        const existing = await prisma.quote.findUnique({
          where: { quoteNumber: quote.quoteNumber }
        })
        
        if (existing) {
          // Update existing quote
          await prisma.quote.update({
            where: { quoteNumber: quote.quoteNumber },
            data: {
              title: quote.title,
              description: quote.description,
              customerId: quote.customerId || null,
              amount: quote.amount ? Number(quote.amount) : 0,
              status: quote.status || 'DRAFT',
              quoteType: quote.quoteType || 'PROJECT',
              isActive: quote.isActive !== undefined ? quote.isActive : true,
              validUntil: quote.validUntil ? new Date(quote.validUntil) : null,
              updatedAt: new Date()
            }
          })
          skipped++
          continue
        }
        
        // Create new quote
        await prisma.quote.create({
          data: {
            quoteNumber: quote.quoteNumber,
            title: quote.title || `Quote ${quote.quoteNumber}`,
            description: quote.description,
            customerId: quote.customerId || null,
            amount: quote.amount ? Number(quote.amount) : 0,
            status: quote.status || 'DRAFT',
            quoteType: quote.quoteType || 'PROJECT',
            isActive: quote.isActive !== undefined ? quote.isActive : true,
            validUntil: quote.validUntil ? new Date(quote.validUntil) : null,
            createdAt: quote.createdAt ? new Date(quote.createdAt) : new Date(),
            updatedAt: quote.updatedAt ? new Date(quote.updatedAt) : new Date()
          }
        })
        
        imported++
        
        if (imported % 50 === 0) {
          console.log(`   📊 Imported ${imported}/${backupData.quotes.length}...`)
        }
      } catch (error) {
        console.error(`   ❌ Error importing quote ${quote.quoteNumber}:`, error.message)
        errors++
      }
    }
    
    console.log('\n✅ Import completed!')
    console.log('='.repeat(50))
    console.log(`📊 Summary:`)
    console.log(`   • Imported: ${imported}`)
    console.log(`   • Updated: ${skipped}`)
    console.log(`   • Errors: ${errors}`)
    console.log(`   • Total processed: ${backupData.quotes.length}`)
    
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

importQuotesOnly()

