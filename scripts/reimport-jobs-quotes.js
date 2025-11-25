const { PrismaClient } = require('@prisma/client')
const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

function parseDate(dateValue) {
  if (!dateValue && dateValue !== 0) return null
  
  if (dateValue instanceof Date) {
    return dateValue
  }
  
  // Try Excel date serial number
  if (typeof dateValue === 'number') {
    const excelEpoch = new Date(1899, 11, 30) // Dec 30, 1899
    const date = new Date(excelEpoch.getTime() + (dateValue - 1) * 24 * 60 * 60 * 1000)
    if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
      return date
    }
  }
  
  if (typeof dateValue === 'string') {
    const trimmed = dateValue.trim()
    if (!trimmed || trimmed === 'N/A' || trimmed === '?') return null
    
    const parsed = new Date(trimmed)
    if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1900 && parsed.getFullYear() < 2100) {
      return parsed
    }
  }
  
  return null
}

function mapQuoteStatus(rawStatus) {
  if (!rawStatus) return 'DRAFT'
  const status = String(rawStatus).trim().toLowerCase()
  if (status.includes('won') || status.includes('sold')) return 'WON'
  if (status.includes('approved') || status.includes('accepted')) return 'APPROVED'
  if (status.includes('sent')) return 'SENT'
  if (status.includes('cancel')) return 'CANCELLED'
  if (status.includes('lost')) return 'LOST'
  return 'DRAFT'
}

function mapJobStatus(rawStatus) {
  if (!rawStatus) return 'ACTIVE'
  const status = String(rawStatus).trim().toLowerCase()
  if (status.includes('complete') || status.includes('done') || status.includes('finished')) return 'COMPLETED'
  if (status.includes('cancel')) return 'CANCELLED'
  if (status.includes('hold') || status.includes('pause')) return 'ON_HOLD'
  return 'ACTIVE'
}

function normalizeCustomerName(name) {
  if (!name) return ''
  return String(name).trim().replace(/\s+/g, ' ')
}

async function getOrCreateCustomer(customerName) {
  if (!customerName || customerName.trim() === '') {
    return null
  }
  
  const normalized = normalizeCustomerName(customerName)
  
  // Try to find existing customer
  let customer = await prisma.customer.findFirst({
    where: {
      name: {
        contains: normalized,
        mode: 'insensitive'
      }
    }
  })
  
  if (!customer) {
    // Create new customer
    customer = await prisma.customer.create({
      data: {
        name: normalized,
        email: null,
        phone: null,
        isActive: true
      }
    })
  }
  
  return customer
}

async function getAdminUser() {
  const admin = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { contains: '@rsautomation.net' } },
        { name: { contains: 'Admin' } }
      ]
    }
  })
  
  if (!admin) {
    throw new Error('No admin user found')
  }
  
  return admin
}

async function importQuotes() {
  try {
    const excelFile = path.join(process.cwd(), 'storage', 'JobList.xlsx')
    if (!fs.existsSync(excelFile)) {
      console.error(`❌ Excel file not found at ${excelFile}`)
      return { created: 0, updated: 0, skipped: 0 }
    }

    console.log(`📥 Loading Excel file: ${excelFile}`)
    const workbook = XLSX.readFile(excelFile)
    const sheet = workbook.Sheets['Quotes']

    if (!sheet) {
      console.log('⚠️  No "Quotes" sheet found, skipping quotes import')
      return { created: 0, updated: 0, skipped: 0 }
    }

    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null })
    console.log(`📊 Found ${rows.length} quote rows`)

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
      const status = mapQuoteStatus(row['Quote Status'] || row['Status'])
      const amount = row['Amount'] || row['Total'] || row['Price'] || 0
      const startDate = parseDate(row['Start Date'] || row['Created Date'] || row['Date'])
      const dueDate = parseDate(row['Due Date'] || row['Valid Until'])
      
      // Get or create customer
      const customerName = row['Customer'] || row['Customer Name'] || row['Cust Name'] || null
      let customer = null
      if (customerName) {
        customer = await getOrCreateCustomer(customerName)
      }

      const data = {
        title,
        description,
        customerContactName: row['Cust. Contact'] ? String(row['Cust. Contact']).trim() : null,
        amount: typeof amount === 'number' ? amount : parseFloat(String(amount)) || 0,
        status,
        quoteType: 'PROJECT',
        isActive: true,
        customerId: customer?.id || null,
        createdAt: startDate || new Date(),
        updatedAt: dueDate || startDate || new Date()
      }

      try {
        const result = await prisma.quote.upsert({
          where: { quoteNumber },
          create: {
            quoteNumber,
            ...data
          },
          update: data
        })

        // Check if this was a create or update by comparing createdAt
        const existing = await prisma.quote.findUnique({ where: { quoteNumber } })
        if (existing && existing.createdAt.getTime() === data.createdAt.getTime()) {
          created++
        } else {
          updated++
        }
      } catch (error) {
        console.error(`   ❌ Error upserting quote ${quoteNumber}:`, error.message)
        skipped++
      }

      if ((created + updated) % 50 === 0) {
        console.log(`   📈 Processed ${created + updated} quotes...`)
      }
    }

    console.log(`✅ Quotes: Created ${created}, Updated ${updated}, Skipped ${skipped}`)
    return { created, updated, skipped }
  } catch (error) {
    console.error('❌ Error importing quotes:', error)
    return { created: 0, updated: 0, skipped: 0 }
  }
}

async function importJobs() {
  try {
    const excelFile = path.join(process.cwd(), 'storage', 'JobList.xlsx')
    if (!fs.existsSync(excelFile)) {
      console.error(`❌ Excel file not found at ${excelFile}`)
      return { created: 0, updated: 0, skipped: 0 }
    }

    console.log(`📥 Loading Excel file: ${excelFile}`)
    const workbook = XLSX.readFile(excelFile)
    const sheet = workbook.Sheets['Jobs'] || workbook.Sheets['Projects']

    if (!sheet) {
      console.log('⚠️  No "Jobs" or "Projects" sheet found, checking all sheets...')
      const sheetNames = workbook.SheetNames
      console.log(`   Available sheets: ${sheetNames.join(', ')}`)
      
      // Try to find a sheet with job data
      let foundSheet = null
      for (const sheetName of sheetNames) {
        if (sheetName.toLowerCase().includes('job') || sheetName.toLowerCase().includes('project')) {
          foundSheet = workbook.Sheets[sheetName]
          console.log(`   Using sheet: ${sheetName}`)
          break
        }
      }
      
      if (!foundSheet) {
        console.log('⚠️  No job sheet found, skipping jobs import')
        return { created: 0, updated: 0, skipped: 0 }
      }
    }

    const sheetToUse = sheet || (() => {
      for (const sheetName of workbook.SheetNames) {
        if (sheetName.toLowerCase().includes('job') || sheetName.toLowerCase().includes('project')) {
          return workbook.Sheets[sheetName]
        }
      }
      return null
    })()

    if (!sheetToUse) {
      console.log('⚠️  No job sheet found, skipping jobs import')
      return { created: 0, updated: 0, skipped: 0 }
    }

    const rows = XLSX.utils.sheet_to_json(sheetToUse, { defval: null })
    console.log(`📊 Found ${rows.length} job rows`)

    const adminUser = await getAdminUser()
    let created = 0
    let updated = 0
    let skipped = 0

    for (const row of rows) {
      const rawNumber = row['Project Number'] || row['Job Number'] || row['Job Num.'] || row['JobNum'] || row['Job #'] || row['Project Num.'] || ''
      const jobNumber = rawNumber ? String(rawNumber).trim() : ''

      if (!jobNumber) {
        skipped++
        continue
      }

      const description = row['Description'] || row['Scope'] || row['Notes'] || null
      const title = description ? description.substring(0, 200) : `Job ${jobNumber}`
      const status = mapJobStatus(row['Status'] || row['Job Status'])
      const startDate = parseDate(row['Start Date'] || row['Created Date'] || row['Date'])
      const dueDate = parseDate(row['Due Date'] || row['End Date'])
      
      // Get or create customer
      const customerName = row['Customer'] || row['Customer Name'] || row['Cust Name'] || null
      let customer = null
      if (customerName) {
        customer = await getOrCreateCustomer(customerName)
      }

      const data = {
        jobNumber,
        title,
        description: description ? String(description).trim() : null,
        type: 'JOB',
        status,
        priority: 'MEDIUM',
        startDate,
        endDate: dueDate,
        estimatedHours: null,
        actualHours: null,
        estimatedCost: null,
        customerId: customer?.id || null,
        createdById: adminUser.id,
        assignedToId: null,
        createdAt: startDate || new Date(),
        updatedAt: dueDate || startDate || new Date()
      }

      try {
        const result = await prisma.job.upsert({
          where: { jobNumber },
          create: data,
          update: {
            title: data.title,
            description: data.description,
            status: data.status,
            startDate: data.startDate,
            endDate: data.endDate,
            customerId: data.customerId,
            updatedAt: data.updatedAt
          }
        })

        // Check if this was a create or update
        const existing = await prisma.job.findUnique({ where: { jobNumber } })
        if (existing && existing.createdAt.getTime() === data.createdAt.getTime()) {
          created++
        } else {
          updated++
        }
      } catch (error) {
        console.error(`   ❌ Error upserting job ${jobNumber}:`, error.message)
        skipped++
      }

      if ((created + updated) % 50 === 0) {
        console.log(`   📈 Processed ${created + updated} jobs...`)
      }
    }

    console.log(`✅ Jobs: Created ${created}, Updated ${updated}, Skipped ${skipped}`)
    return { created, updated, skipped }
  } catch (error) {
    console.error('❌ Error importing jobs:', error)
    return { created: 0, updated: 0, skipped: 0 }
  }
}

async function main() {
  try {
    console.log('🚀 Starting Jobs & Quotes Reimport...\n')
    
    const quotesResult = await importQuotes()
    console.log('')
    const jobsResult = await importJobs()
    
    console.log('\n' + '='.repeat(50))
    console.log('📊 Import Summary:')
    console.log('='.repeat(50))
    console.log(`Quotes: ${quotesResult.created} created, ${quotesResult.updated} updated, ${quotesResult.skipped} skipped`)
    console.log(`Jobs: ${jobsResult.created} created, ${jobsResult.updated} updated, ${jobsResult.skipped} skipped`)
    
    const totalQuotes = await prisma.quote.count()
    const totalJobs = await prisma.job.count({ where: { type: 'JOB' } })
    
    console.log(`\n📈 Total in database: ${totalQuotes} quotes, ${totalJobs} jobs`)
    console.log('✅ Reimport complete!\n')
    
    await prisma.$disconnect()
  } catch (error) {
    console.error('❌ Fatal error:', error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

main()

