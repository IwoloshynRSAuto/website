const { PrismaClient } = require('@prisma/client')
const XLSX = require('xlsx')
const path = require('path')
const fs = require('fs')

const prisma = new PrismaClient()

function parseDate(value) {
  if (!value) return null
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed) {
      return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d))
    }
  }
  const parsed = Date.parse(value)
  if (!Number.isNaN(parsed)) {
    return new Date(parsed)
  }
  return null
}

function mapStatus(rawStatus) {
  if (!rawStatus) return 'DRAFT'
  const status = rawStatus.toString().trim().toLowerCase()
  if (!status) return 'DRAFT'
  if (status.includes('won') || status.includes('sold')) return 'WON'
  if (status.includes('approved') || status.includes('accepted')) return 'APPROVED'
  if (status.includes('sent')) return 'SENT'
  if (status.includes('cancel')) return 'CANCELLED'
  if (status.includes('lost')) return 'LOST'
  return 'DRAFT'
}

async function importQuotes() {
  try {
    const excelFile = path.join(process.cwd(), 'storage', 'JobList.xlsx')
    if (!fs.existsSync(excelFile)) {
      console.error(`❌ Excel file not found at ${excelFile}`)
      process.exit(1)
    }

    console.log(`📥 Loading Excel file: ${excelFile}`)
    const workbook = XLSX.readFile(excelFile)
    const sheet = workbook.Sheets['Quotes']

    if (!sheet) {
      console.error('❌ Could not find "Quotes" sheet in workbook')
      process.exit(1)
    }

    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null })
    console.log(`📊 Rows detected: ${rows.length}`)

    let created = 0
    let updated = 0
    let skipped = 0

    for (const row of rows) {
      const rawNumber = row['Quote Num.'] || row['Quote Number'] || row['Quote'] || ''
      const quoteNumber = rawNumber ? String(rawNumber).trim() : ''

      if (!quoteNumber) {
        skipped++
        continue
      }

      const description = row['Description'] ? String(row['Description']).trim() : null
      const title = description ? description.substring(0, 200) : `Quote ${quoteNumber}`
      const status = mapStatus(row['Quote Status'])
      const startDate = parseDate(row['Start Date'])
      const dueDate = parseDate(row['Due Date'])

      const data = {
        title,
        description,
        customerContactName: row['Cust. Contact'] ? String(row['Cust. Contact']).trim() : null,
        amount: 0,
        status,
        quoteType: 'PROJECT',
        isActive: true,
        createdAt: startDate || new Date(),
        updatedAt: dueDate || startDate || new Date()
      }

      const result = await prisma.quote.upsert({
        where: { quoteNumber },
        create: {
          quoteNumber,
          ...data
        },
        update: data
      })

      if (result.createdAt.getTime() === data.createdAt.getTime()) {
        created++
      } else {
        updated++
      }

      if ((created + updated) % 50 === 0) {
        console.log(`   📈 Processed ${created + updated} quotes...`)
      }
    }

    const totalQuotes = await prisma.quote.count()

    console.log('\n✅ Quote import complete')
    console.log('='.repeat(50))
    console.log(`   • Created: ${created}`)
    console.log(`   • Updated: ${updated}`)
    console.log(`   • Skipped (missing number): ${skipped}`)
    console.log(`   • Total rows processed: ${rows.length}`)
    console.log(`   • Quotes in database: ${totalQuotes}`)

    await prisma.$disconnect()
  } catch (error) {
    console.error('❌ Failed to import quotes:', error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

importQuotes()


