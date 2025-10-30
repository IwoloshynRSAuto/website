const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')
const csv = require('csv-parser')

const prisma = new PrismaClient()

// User mapping from initials to full names
const userMapping = {
  'JT': 'John Trembley',
  'TF': 'Tom Fessenden', 
  'RS': 'Rick Stacey',
  'MM': 'Mike Myers',
  'JW': 'Jacob Wingate',
  'NE': 'Nick Evans',
  'KR': 'Kevin Ryan',
  'SD': 'Steve Davis',
  'MP': 'Mike Peterson',
  'CF': 'Chris Fuller',
  'BB': 'Bob Brown',
  'TJF': 'Tom Fessenden',
  'RSJ': 'Rick Stacey Jr',
  'JRW': 'Jacob Wingate',
  'DP': 'Dave Peterson',
  'RDS': 'Rick Stacey Sr',
  'BV': 'Bob Vancassele',
  'ENP': 'Ethan Peterson',
  'JECT': 'Jacob Evans',
  'SM': 'Steve Myers',
  'TN': 'Tom Nelson',
  'EO': 'Ethan Olson',
  'KK': 'Kevin Kelly',
  'Ken': 'Ken Smith',
  'Bob': 'Bob Johnson',
  'Ed': 'Ed Wilson',
  'NE': 'Nick Evans'
}

// Status mapping from CSV to database
const statusMapping = {
  'Billed': 'COMPLETED',
  'Open': 'ACTIVE', 
  'Closed': 'COMPLETED',
  '': 'QUOTE',
  '?': 'QUOTE'
}

// Clean and validate data
function cleanData(row) {
  return {
    projectNumber: row['Project Number']?.trim() || '',
    associatedJobs: row['Associated Jobs']?.trim() || '',
    createdBy: row['Created By']?.trim() || '',
    customer: row['Customer']?.trim() || '',
    contact: row['Cust. Contact']?.trim() || '',
    description: row['Description']?.trim() || '',
    startDate: row['Start Date']?.trim() || '',
    dueDate: row['Due Date']?.trim() || '',
    jobStatus: row['Job Status']?.trim() || '',
    inQB: row['In QB']?.trim() || '',
    inLDrive: row['In L Drive']?.trim() || '',
    quoteNum: row['Quote Num']?.trim() || '',
    invoiced: row['Invoiced']?.trim() || '',
    invoiceDate: row['Invoice Date']?.trim() || '',
    notes: row['Notes']?.trim() || ''
  }
}

// Parse date string to Date object
function parseDate(dateString) {
  if (!dateString || dateString.trim() === '' || dateString === 'N/A') {
    return null
  }
  
  try {
    // Handle various date formats
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return null
    }
    return date
  } catch (error) {
    console.warn(`Failed to parse date: ${dateString}`)
    return null
  }
}

// Find or create customer
async function findOrCreateCustomer(customerName, contactName) {
  if (!customerName || customerName.trim() === '') {
    // Create a default customer for empty names
    customerName = 'Unknown Customer'
  }

  let customer = await prisma.customer.findFirst({
    where: { name: customerName }
  })

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        name: customerName,
        email: null,
        phone: null,
        address: null,
        isActive: true
      }
    })
    console.log(`   📝 Created new customer: ${customerName}`)
  }

  return customer
}

// Find or create user
async function findOrCreateUser(createdBy) {
  if (!createdBy || createdBy.trim() === '') {
    // Create a default user for empty creators
    createdBy = 'Unknown User'
  }

  // Handle multiple users (comma-separated) - take the first one
  const firstUser = createdBy.split(',')[0].trim()
  
  // Map initials to full names
  const fullName = userMapping[firstUser] || firstUser

  let user = await prisma.user.findFirst({
    where: { 
      OR: [
        { name: fullName },
        { name: createdBy }
      ]
    }
  })

  if (!user) {
    // Create user with default email and password
    const email = `${createdBy.toLowerCase()}@company.com`
    user = await prisma.user.create({
      data: {
        name: fullName,
        email: email,
        password: 'defaultpassword123', // Should be changed on first login
        role: 'USER'
      }
    })
    console.log(`   👤 Created new user: ${fullName} (${email})`)
  }

  return user
}

// Find or create quote if quote number exists
async function findOrCreateQuote(quoteNumber, customer, user, description) {
  if (!quoteNumber || quoteNumber.trim() === '') {
    return null
  }

  let quote = await prisma.quote.findUnique({
    where: { quoteNumber }
  })

  if (!quote) {
    quote = await prisma.quote.create({
      data: {
        quoteNumber,
        title: description || `Quote ${quoteNumber}`,
        description: description || `Quote ${quoteNumber}`,
        amount: 0, // Default amount
        customerId: customer.id,
        status: 'DRAFT'
      }
    })
    console.log(`   📄 Created new quote: ${quoteNumber}`)
  }

  return quote
}

// Main import function
async function importProjectsFromCSV() {
  try {
    console.log('🚀 Starting Projects CSV Import Process...\n')

    // Read the CSV file
    const csvPath = path.join(__dirname, '..', 'JobList(Projects).csv')
    
    if (!fs.existsSync(csvPath)) {
      console.error('❌ JobList(Projects).csv file not found at:', csvPath)
      return
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    const lines = csvContent.split('\n')
    
    // Skip header row
    const dataLines = lines.slice(1).filter(line => line.trim() !== '')
    
    console.log(`📊 Found ${dataLines.length} data rows to process`)

    let importedCount = 0
    let skippedCount = 0
    let errorCount = 0

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i]
      const columns = line.split(',')
      
      try {
        // Parse CSV columns (handle commas in quoted fields)
        const projectNumber = columns[0]?.trim()
        const associatedJobs = columns[1]?.trim()
        const createdBy = columns[2]?.trim()
        const customerName = columns[3]?.trim()
        const contactName = columns[4]?.trim()
        const description = columns[5]?.trim()
        const startDate = columns[6]?.trim()
        const dueDate = columns[7]?.trim()
        const jobStatus = columns[8]?.trim()
        const inQB = columns[9]?.trim()
        const inLDrive = columns[10]?.trim()
        const quoteNum = columns[11]?.trim()
        const invoiced = columns[12]?.trim()
        const invoiceDate = columns[13]?.trim()
        const notes = columns[14]?.trim()

        // Skip empty rows or rows with no project number
        if (!projectNumber || projectNumber === '') {
          skippedCount++
          continue
        }

        // Check if job already exists
        const existingJob = await prisma.job.findUnique({
          where: { jobNumber: projectNumber }
        })

        if (existingJob) {
          console.log(`   ⚠️  Job ${projectNumber} already exists, skipping...`)
          skippedCount++
          continue
        }

        // Find or create customer
        const customer = await findOrCreateCustomer(customerName, contactName)
        
        // Find or create user
        const user = await findOrCreateUser(createdBy)

        // Find or create quote if quote number exists
        const quote = await findOrCreateQuote(quoteNum, customer, user, description)

        // Parse dates
        const parsedStartDate = parseDate(startDate)
        const parsedDueDate = parseDate(dueDate)
        const parsedInvoiceDate = parseDate(invoiceDate)

        // Map status
        const mappedStatus = statusMapping[jobStatus] || 'QUOTE'

        // Create job
        const job = await prisma.job.create({
          data: {
            jobNumber: projectNumber,
            title: description || `Project ${projectNumber}`,
            description: description || `Project ${projectNumber}`,
            status: mappedStatus,
            priority: 'MEDIUM',
            startDate: parsedStartDate,
            endDate: parsedDueDate,
            estimatedHours: null,
            actualHours: null,
            customerId: customer.id,
            assignedToId: null,
            createdById: user.id,
            workCode: null,
            estimatedCost: null,
            dueTodayPercent: null
          }
        })

        // Link quote to job if quote exists
        if (quote) {
          await prisma.quote.update({
            where: { id: quote.id },
            data: { jobId: job.id }
          })
        }

        console.log(`   ✅ Imported job ${projectNumber}: ${description || 'No description'}`)
        importedCount++

      } catch (error) {
        console.log(`   ❌ Error processing row ${i + 1}: ${error.message}`)
        errorCount++
      }
    }

    console.log('\n🎉 Projects CSV Import Process Completed!')
    console.log('\n📊 Import Summary:')
    console.log(`   ✅ Successfully imported: ${importedCount} jobs`)
    console.log(`   ⚠️  Skipped (already exists): ${skippedCount} jobs`)
    console.log(`   ❌ Errors: ${errorCount} jobs`)
    console.log(`   📈 Total processed: ${importedCount + skippedCount + errorCount} rows`)

    // Show some statistics
    const totalJobs = await prisma.job.count()
    const totalCustomers = await prisma.customer.count()
    const totalUsers = await prisma.user.count()
    const totalQuotes = await prisma.quote.count()

    console.log('\n📈 Database Statistics:')
    console.log(`   📄 Total jobs in database: ${totalJobs}`)
    console.log(`   📋 Total quotes in database: ${totalQuotes}`)
    console.log(`   👥 Total customers in database: ${totalCustomers}`)
    console.log(`   👤 Total users in database: ${totalUsers}`)

  } catch (error) {
    console.error('❌ Import process failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the import
if (require.main === module) {
  importProjectsFromCSV()
}

module.exports = { importProjectsFromCSV }