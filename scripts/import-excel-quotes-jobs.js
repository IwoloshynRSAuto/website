const { PrismaClient } = require('@prisma/client')
const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

// Simple fuzzy matching function (Levenshtein distance based)
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()
  if (s1 === s2) return 100
  
  const longer = s1.length > s2.length ? s1 : s2
  const shorter = s1.length > s2.length ? s2 : s1
  if (longer.length === 0) return 100
  
  const distance = levenshteinDistance(longer, shorter)
  return Math.round(((longer.length - distance) / longer.length) * 100)
}

function levenshteinDistance(str1, str2) {
  const matrix = []
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  return matrix[str2.length][str1.length]
}

function normalizeCustomerName(name) {
  if (!name) return ''
  
  let normalized = String(name).trim()
  
  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, ' ')
  
  // Normalize common abbreviations
  normalized = normalized.replace(/\bCo\.?\b/gi, 'Company')
  normalized = normalized.replace(/\bInc\.?\b/gi, 'Inc')
  normalized = normalized.replace(/\bLLC\.?\b/gi, 'LLC')
  normalized = normalized.replace(/\bLtd\.?\b/gi, 'Ltd')
  
  // Title case
  const words = normalized.split(' ')
  const normalizedWords = words.map(word => {
    const upper = word.toUpperCase()
    if (['LLC', 'INC', 'LTD', 'NF', 'USA', 'US'].includes(upper)) {
      return upper
    }
    const lower = word.toLowerCase()
    if (['of', 'the', 'and', 'or', 'a', 'an', 'in', 'on', 'at', 'to', 'for'].includes(lower)) {
      return lower
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  })
  
  return normalizedWords.join(' ')
}

function findCustomerMatch(customerName, existingCustomers) {
  if (!customerName || !existingCustomers || existingCustomers.length === 0) {
    return null
  }
  
  const normalizedName = normalizeCustomerName(customerName)
  
  let bestMatch = null
  let bestScore = 0
  
  for (const customer of existingCustomers) {
    const score = calculateSimilarity(normalizedName, customer.name)
    if (score >= 90) {
      return customer // High confidence match
    }
    if (score >= 80 && score > bestScore) {
      bestMatch = customer
      bestScore = score
    }
  }
  
  return bestMatch // Return best match if 80-89, or null if < 80
}

// Employee abbreviation mapping
const EMPLOYEE_ABBREVIATIONS = {
  'JT': 'Jonathan Trembly',
  'JW': 'John Woloshyn',
  'IW': 'Ian Woloshyn',
}

function normalizeEmployeeName(name) {
  if (!name) return 'Unknown'
  
  let normalized = String(name).trim()
  
  // Handle multiple names separated by /
  if (normalized.includes('/')) {
    normalized = normalized.split('/')[0].trim()
  }
  
  // Check abbreviations
  const upper = normalized.toUpperCase()
  if (EMPLOYEE_ABBREVIATIONS[upper]) {
    normalized = EMPLOYEE_ABBREVIATIONS[upper]
  }
  
  // Title case
  const words = normalized.split(' ')
  const normalizedWords = words.map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  )
  
  return normalizedWords.join(' ')
}

function parseDate(dateValue) {
  if (!dateValue && dateValue !== 0) return null
  
  if (dateValue instanceof Date) {
    return dateValue
  }
  
  // Try Excel date serial number first (common in Excel exports)
  if (typeof dateValue === 'number') {
    // Excel epoch is 1900-01-01, but JavaScript uses 1970-01-01
    // Excel incorrectly treats 1900 as a leap year, so we need to adjust
    // Excel serial date 1 = 1900-01-01, but Excel thinks 1900 was a leap year
    // So we subtract 1 day to account for this
    const excelEpoch = new Date(1899, 11, 30) // Dec 30, 1899
    const date = new Date(excelEpoch.getTime() + (dateValue - 1) * 24 * 60 * 60 * 1000)
    if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
      return date
    }
  }
  
  if (typeof dateValue === 'string') {
    const trimmed = dateValue.trim()
    if (!trimmed || trimmed === 'N/A' || trimmed === '?') return null
    
    // Try common formats
    const parsed = new Date(trimmed)
    if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1900 && parsed.getFullYear() < 2100) {
      return parsed
    }
  }
  
  return null
}

function detectQuoteVsJob(row, headers) {
  const rowStr = Object.values(row).join(' ').toLowerCase()
  
  // Check number columns
  const numberCols = ['Quote Num.', 'Quote Number', 'QuoteNum', 'Quote #', 'Quote', 'Job Number', 'Job Num.', 'JobNum', 'Job #', 'Project Number', 'Project Num.', 'ProjectNum']
  for (const col of numberCols) {
    if (row[col] && String(row[col]).toLowerCase()) {
      const value = String(row[col]).toLowerCase()
      if (value.includes('quote') || value.includes('q-') || value.includes('q_')) {
        return 'QUOTE'
      }
      if (value.includes('job') || value.includes('j-') || value.includes('j_') || value.includes('project') || value.includes('proj')) {
        return 'JOB'
      }
    }
  }
  
  // Check status columns
  const statusCols = ['Status', 'Quote Status', 'Job Status', 'Type']
  for (const col of statusCols) {
    if (row[col]) {
      const value = String(row[col]).toLowerCase()
      if (value.includes('quote')) return 'QUOTE'
      if (value.includes('job') || value.includes('project')) return 'JOB'
    }
  }
  
  // Default check
  if (rowStr.includes('quote')) return 'QUOTE'
  if (rowStr.includes('job') || rowStr.includes('project')) return 'JOB'
  
  return 'UNKNOWN'
}

async function main() {
  const excelFilePath = process.argv[2] || 'JobList.xlsx'
  const filePath = path.join(__dirname, '..', 'storage', excelFilePath)
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`)
    process.exit(1)
  }
  
  console.log(`📂 Loading Excel file: ${filePath}`)
  
  try {
    // Load Excel file
    const workbook = XLSX.readFile(filePath)
    const sheetNames = workbook.SheetNames
    
    console.log(`   ✓ Found ${sheetNames.length} sheet(s): ${sheetNames.join(', ')}`)
    
    let quotesData = []
    let jobsData = []
    
    // Process each sheet
    for (const sheetName of sheetNames) {
      const worksheet = workbook.Sheets[sheetName]
      const data = XLSX.utils.sheet_to_json(worksheet)
      
      if (data.length === 0) {
        console.log(`   ⚠️  Skipping empty sheet "${sheetName}"`)
        continue
      }
      
      console.log(`   📊 Processing sheet "${sheetName}" (${data.length} rows)`)
      
      const sheetLower = sheetName.toLowerCase()
      
      // Check if sheet has quote-specific columns
      const headers = Object.keys(data[0] || {})
      const hasQuoteNum = headers.some(k => {
        const kLower = k.toLowerCase()
        return kLower.includes('quote num') || kLower === 'quote num.' || kLower === 'quote number'
      })
      const hasProjectNum = headers.some(k => {
        const kLower = k.toLowerCase()
        return kLower.includes('project number') || (kLower.includes('job number') && !hasQuoteNum)
      })
      
      if (sheetLower.includes('quote') || (hasQuoteNum && !hasProjectNum)) {
        quotesData = quotesData.concat(data)
        console.log(`   ✓ Identified as Quotes sheet (${data.length} rows, total quotes: ${quotesData.length})`)
      } else if (sheetLower.includes('job') || sheetLower.includes('project') || hasProjectNum) {
        jobsData = jobsData.concat(data)
        console.log(`   ✓ Identified as Jobs/Projects sheet (${data.length} rows, total jobs: ${jobsData.length})`)
      } else {
        // Auto-detect
        console.log(`   🔍 Auto-detecting Quotes vs Jobs...`)
        const quotes = []
        const jobs = []
        
        for (const row of data) {
          const type = detectQuoteVsJob(row, Object.keys(row))
          if (type === 'QUOTE') {
            quotes.push(row)
          } else if (type === 'JOB') {
            jobs.push(row)
          }
        }
        
        if (quotes.length > 0) {
          quotesData = quotesData.concat(quotes)
          console.log(`   ✓ Detected ${quotes.length} quote rows (total quotes: ${quotesData.length})`)
        }
        if (jobs.length > 0) {
          jobsData = jobsData.concat(jobs)
          console.log(`   ✓ Detected ${jobs.length} job rows (total jobs: ${jobsData.length})`)
        }
      }
    }
    
    // Connect to database
    console.log('\n🔌 Connecting to database...')
    
    // Load existing data
    console.log('📊 Loading existing data...')
    
    const existingCustomers = await prisma.customer.findMany({
      where: { isActive: true },
      select: { id: true, name: true }
    })
    console.log(`   ✓ Found ${existingCustomers.length} existing customers`)
    
    const existingUsers = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true }
    })
    const usersMap = {}
    for (const user of existingUsers) {
      if (user.name) usersMap[user.name] = user
    }
    console.log(`   ✓ Found ${existingUsers.length} existing users`)
    
    const existingQuotes = await prisma.quote.findMany({
      select: { quoteNumber: true }
    })
    const existingQuoteNumbers = new Set(existingQuotes.map(q => q.quoteNumber))
    console.log(`   ✓ Found ${existingQuotes.length} existing quotes`)
    
    const existingJobs = await prisma.job.findMany({
      select: { jobNumber: true }
    })
    const existingJobNumbers = new Set(existingJobs.map(j => j.jobNumber))
    console.log(`   ✓ Found ${existingJobs.length} existing jobs`)
    
    // Statistics
    const stats = {
      customersCreated: 0,
      customersMatched: 0,
      employeesCreated: 0,
      employeesMatched: 0,
      quotesImported: 0,
      jobsImported: 0
    }
    
    // Customer and user caches
    const customerCache = {}
    const userCache = {}
    
    // Process Quotes
    if (quotesData.length > 0) {
      console.log(`\n📋 Processing ${quotesData.length} Quotes...`)
      
      let skippedNoNumber = 0
      let skippedExists = 0
      let processed = 0
      
      for (let idx = 0; idx < quotesData.length; idx++) {
        const row = quotesData[idx]
        
        try {
          // Extract quote number
          let quoteNumber = null
          for (const col of ['Quote Num.', 'Quote Number', 'QuoteNum', 'Quote #', 'Quote', 'QuoteNum.']) {
            if (row[col] !== undefined && row[col] !== null && row[col] !== '') {
              quoteNumber = String(row[col]).trim()
              if (quoteNumber) break
            }
          }
          
          if (!quoteNumber) {
            skippedNoNumber++
            if (idx < 3) console.log(`   ⚠️  Row ${idx + 1}: No quote number. Available keys:`, Object.keys(row).slice(0, 5))
            continue // Skip rows without quote numbers
          }
          
          // Normalize quote number (handle cases like "Q06" -> "Q0006" if needed)
          if (existingQuoteNumbers.has(quoteNumber)) {
            skippedExists++
            if (idx < 3) console.log(`   ⚠️  Row ${idx + 1}: Quote "${quoteNumber}" already exists`)
            continue // Skip if already exists
          }
          
          processed++
          if (idx < 3 || processed <= 3) console.log(`   ✓ Row ${idx + 1}: Processing quote "${quoteNumber}"`)
          
          // Extract customer
          let customerName = null
          for (const col of ['Customer', 'Customer Name', 'Cust Name', 'Client']) {
            if (row[col] !== undefined && row[col] !== null && row[col] !== '') {
              customerName = String(row[col]).trim()
              if (customerName) break
            }
          }
          
          if (!customerName) {
            customerName = 'Unknown Customer'
          }
          
          // Find or create customer
          const normalizedCustomer = normalizeCustomerName(customerName)
          let customerId
          
          if (customerCache[normalizedCustomer]) {
            customerId = customerCache[normalizedCustomer]
            stats.customersMatched++
          } else {
            const match = findCustomerMatch(customerName, existingCustomers)
            if (match) {
              customerId = match.id
              customerCache[normalizedCustomer] = customerId
              stats.customersMatched++
            } else {
              const customer = await prisma.customer.create({
                data: {
                  name: normalizedCustomer,
                  isActive: true
                }
              })
              customerId = customer.id
              customerCache[normalizedCustomer] = customerId
              existingCustomers.push({ id: customerId, name: normalizedCustomer })
              stats.customersCreated++
            }
          }
          
          // Created By
          let createdByName = null
          for (const col of ['Created By', 'CreatedBy', 'Creator', 'Author']) {
            if (row[col]) {
              createdByName = String(row[col]).trim()
              break
            }
          }
          
          if (!createdByName) {
            createdByName = 'Unknown'
          }
          
          const normalizedEmployee = normalizeEmployeeName(createdByName)
          let createdById
          
          if (userCache[normalizedEmployee]) {
            createdById = userCache[normalizedEmployee]
            stats.employeesMatched++
          } else {
            const userMatch = usersMap[normalizedEmployee]
            if (userMatch) {
              createdById = userMatch.id
              userCache[normalizedEmployee] = createdById
              stats.employeesMatched++
            } else {
              const email = `${normalizedEmployee.toLowerCase().replace(/\s+/g, '.')}@placeholder.local`
              const user = await prisma.user.create({
                data: {
                  email,
                  name: normalizedEmployee,
                  role: 'USER',
                  isActive: true
                }
              })
              createdById = user.id
              userCache[normalizedEmployee] = createdById
              usersMap[normalizedEmployee] = { id: createdById, name: normalizedEmployee, email }
              stats.employeesCreated++
            }
          }
          
          // Description
          let description = null
          for (const col of ['Description', 'Desc', 'Title', 'Quote Description']) {
            if (row[col]) {
              description = String(row[col]).trim()
              break
            }
          }
          
          if (!description) {
            description = `Quote ${quoteNumber}`
          }
          
          // Amount
          let amount = 0
          for (const col of ['Amount', 'Total', 'Quote Amount', 'Value', 'Price']) {
            if (row[col]) {
              const val = parseFloat(row[col])
              if (!isNaN(val)) {
                amount = val
                break
              }
            }
          }
          
          // Status
          let status = 'DRAFT'
          for (const col of ['Status', 'Quote Status', 'State']) {
            if (row[col]) {
              const statusStr = String(row[col]).trim().toUpperCase()
              if (statusStr.includes('APPROVED') || statusStr.includes('WON')) {
                status = 'APPROVED'
              } else if (statusStr.includes('CANCELLED') || statusStr.includes('CANCEL')) {
                status = 'CANCELLED'
              } else if (statusStr.includes('SENT')) {
                status = 'SENT'
              }
              break
            }
          }
          
          // Valid Until
          let validUntil = null
          for (const col of ['Valid Until', 'ValidUntil', 'Expiry', 'Expiration Date']) {
            if (row[col]) {
              validUntil = parseDate(row[col])
              break
            }
          }
          
          // Insert quote
          await prisma.quote.upsert({
            where: { quoteNumber },
            update: {
              title: description.substring(0, 200),
              description,
              customerId,
              amount,
              status,
              validUntil,
              updatedAt: new Date()
            },
            create: {
              quoteNumber,
              title: description.substring(0, 200),
              description,
              customerId,
              amount,
              status,
              validUntil,
              isActive: true,
              quoteType: 'PROJECT'
            }
          })
          
          existingQuoteNumbers.add(quoteNumber)
          stats.quotesImported++
          
          if ((idx + 1) % 50 === 0) {
            console.log(`   📊 Processed ${idx + 1}/${quotesData.length} quotes...`)
          }
        } catch (error) {
          console.error(`   ⚠️  Error processing quote row ${idx + 1}:`, error.message)
        }
      }
      
      console.log(`   ✅ Quotes import completed: ${stats.quotesImported} imported`)
      if (skippedNoNumber > 0) console.log(`      ⚠️  Skipped ${skippedNoNumber} rows without quote numbers`)
      if (skippedExists > 0) console.log(`      ⚠️  Skipped ${skippedExists} quotes that already exist`)
    }
    
    // Process Jobs
    if (jobsData.length > 0) {
      console.log('\n🏗️  Processing Jobs...')
      
      for (let idx = 0; idx < jobsData.length; idx++) {
        const row = jobsData[idx]
        
        try {
          // Extract job number
          let jobNumber = null
          for (const col of ['Project Number', 'Job Number', 'Job Num.', 'JobNum', 'Job #', 'Project Num.', 'ProjectNum']) {
            if (row[col] !== undefined && row[col] !== null && row[col] !== '') {
              jobNumber = String(row[col]).trim()
              if (jobNumber) break
            }
          }
          
          if (!jobNumber) {
            if (idx < 5) console.log(`   ⚠️  Row ${idx + 1}: No job number found. Row keys:`, Object.keys(row))
            continue // Skip rows without job numbers
          }
          
          if (existingJobNumbers.has(jobNumber)) {
            if (idx < 5) console.log(`   ⚠️  Row ${idx + 1}: Job ${jobNumber} already exists, skipping`)
            continue // Skip if already exists
          }
          
          if (idx < 5) console.log(`   ✓ Row ${idx + 1}: Processing job ${jobNumber}`)
          
          // Customer (same logic as quotes)
          let customerName = null
          for (const col of ['Customer', 'Customer Name', 'Cust Name', 'Client']) {
            if (row[col]) {
              customerName = String(row[col]).trim()
              break
            }
          }
          
          if (!customerName) {
            customerName = 'Unknown Customer'
          }
          
          const normalizedCustomer = normalizeCustomerName(customerName)
          let customerId
          
          if (customerCache[normalizedCustomer]) {
            customerId = customerCache[normalizedCustomer]
          } else {
            const match = findCustomerMatch(customerName, existingCustomers)
            if (match) {
              customerId = match.id
              customerCache[normalizedCustomer] = customerId
            } else {
              const customer = await prisma.customer.create({
                data: {
                  name: normalizedCustomer,
                  isActive: true
                }
              })
              customerId = customer.id
              customerCache[normalizedCustomer] = customerId
              existingCustomers.push({ id: customerId, name: normalizedCustomer })
            }
          }
          
          // Created By
          let createdByName = null
          for (const col of ['Created By', 'CreatedBy', 'Creator', 'Author']) {
            if (row[col]) {
              createdByName = String(row[col]).trim()
              break
            }
          }
          
          if (!createdByName) {
            createdByName = 'Unknown'
          }
          
          const normalizedEmployee = normalizeEmployeeName(createdByName)
          let createdById
          
          if (userCache[normalizedEmployee]) {
            createdById = userCache[normalizedEmployee]
          } else {
            const userMatch = usersMap[normalizedEmployee]
            if (userMatch) {
              createdById = userMatch.id
              userCache[normalizedEmployee] = createdById
            } else {
              const email = `${normalizedEmployee.toLowerCase().replace(/\s+/g, '.')}@placeholder.local`
              const user = await prisma.user.create({
                data: {
                  email,
                  name: normalizedEmployee,
                  role: 'USER',
                  isActive: true
                }
              })
              createdById = user.id
              userCache[normalizedEmployee] = createdById
              usersMap[normalizedEmployee] = { id: createdById, name: normalizedEmployee, email }
            }
          }
          
          // Title/Description
          let title = null
          for (const col of ['Title', 'Description', 'Desc', 'Job Description', 'Project Description']) {
            if (row[col]) {
              title = String(row[col]).trim()
              break
            }
          }
          
          if (!title) {
            title = `Job ${jobNumber}`
          }
          
          const description = title
          
          // Status
          let status = 'ACTIVE'
          for (const col of ['Status', 'Job Status', 'State', 'Project Status']) {
            if (row[col]) {
              const statusStr = String(row[col]).trim().toUpperCase()
              if (statusStr.includes('COMPLETE') || statusStr.includes('FINISHED')) {
                status = 'COMPLETED'
              } else if (statusStr.includes('CANCELLED') || statusStr.includes('CANCEL')) {
                status = 'CANCELLED'
              } else if (statusStr.includes('ON HOLD') || statusStr.includes('HOLD')) {
                status = 'ON_HOLD'
              }
              break
            }
          }
          
          // Assigned To
          let assignedToId = null
          let assignedToName = null
          for (const col of ['Assigned To', 'AssignedTo', 'Assigned Tech', 'Technician', 'Tech']) {
            if (row[col]) {
              assignedToName = String(row[col]).trim()
              break
            }
          }
          
          if (assignedToName) {
            const normalizedAssigned = normalizeEmployeeName(assignedToName)
            if (userCache[normalizedAssigned]) {
              assignedToId = userCache[normalizedAssigned]
            } else {
              const userMatch = usersMap[normalizedAssigned]
              if (userMatch) {
                assignedToId = userMatch.id
                userCache[normalizedAssigned] = assignedToId
              } else {
                const email = `${normalizedAssigned.toLowerCase().replace(/\s+/g, '.')}@placeholder.local`
                const user = await prisma.user.create({
                  data: {
                    email,
                    name: normalizedAssigned,
                    role: 'USER',
                    isActive: true
                  }
                })
                assignedToId = user.id
                userCache[normalizedAssigned] = assignedToId
                usersMap[normalizedAssigned] = { id: assignedToId, name: normalizedAssigned, email }
              }
            }
          }
          
          // Dates
          let startDate = null
          for (const col of ['Start Date', 'StartDate', 'Begin Date']) {
            if (row[col]) {
              startDate = parseDate(row[col])
              break
            }
          }
          
          let endDate = null
          for (const col of ['End Date', 'EndDate', 'Due Date', 'DueDate', 'Completion Date']) {
            if (row[col]) {
              endDate = parseDate(row[col])
              break
            }
          }
          
          // Link to quote
          let relatedQuoteId = null
          let quoteNumber = null
          for (const col of ['Quote Number', 'Quote Num.', 'QuoteNum', 'Related Quote']) {
            if (row[col]) {
              quoteNumber = String(row[col]).trim()
              break
            }
          }
          
          if (quoteNumber) {
            const quote = await prisma.quote.findUnique({
              where: { quoteNumber },
              select: { id: true }
            })
            if (quote) {
              relatedQuoteId = quote.id
            }
          }
          
          // Insert job
          await prisma.job.upsert({
            where: { jobNumber },
            update: {
              title,
              description,
              customerId,
              assignedToId,
              status,
              startDate,
              endDate,
              relatedQuoteId,
              updatedAt: new Date()
            },
            create: {
              jobNumber,
              title,
              description,
              customerId,
              createdById,
              assignedToId,
              status,
              startDate,
              endDate,
              relatedQuoteId,
              type: 'JOB',
              priority: 'MEDIUM'
            }
          })
          
          existingJobNumbers.add(jobNumber)
          stats.jobsImported++
          
          if ((idx + 1) % 50 === 0) {
            console.log(`   📊 Processed ${idx + 1}/${jobsData.length} jobs...`)
          }
        } catch (error) {
          console.error(`   ⚠️  Error processing job row ${idx + 1}:`, error.message)
        }
      }
      
      console.log(`   ✅ Jobs import completed: ${stats.jobsImported} imported`)
    }
    
    // Output summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 IMPORT SUMMARY')
    console.log('='.repeat(60))
    console.log(`Customers created: ${stats.customersCreated}`)
    console.log(`Customers matched: ${stats.customersMatched}`)
    console.log(`Employees created: ${stats.employeesCreated}`)
    console.log(`Employees matched: ${stats.employeesMatched}`)
    console.log(`Quotes imported: ${stats.quotesImported}`)
    console.log(`Jobs imported: ${stats.jobsImported}`)
    console.log('='.repeat(60))
    
    await prisma.$disconnect()
    
  } catch (error) {
    console.error('\n❌ Error:', error)
    console.error(error.stack)
    await prisma.$disconnect()
    process.exit(1)
  }
}

main()

