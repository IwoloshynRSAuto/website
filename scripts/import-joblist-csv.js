/**
 * Import quotes (Quote model) and projects (Job model type=JOB) from CSV files.
 *
 * Path resolution (each file): CLI arg → JOBLIST_QUOTES_CSV / JOBLIST_PROJECTS_CSV
 * → data/import/<name> if present → project root <name>.
 * Default names: JobList(Quotes).csv, JobList(Projects).csv
 *
 * Usage: node scripts/import-joblist-csv.js [quotes.csv] [projects.csv]
 *
 * Project job numbers are normalized with an E prefix (see lib/utils/job-number.ts).
 * Rows that are not quotes/jobs are skipped by column mapping.
 */
const fs = require('fs')
const path = require('path')
const csv = require('csv-parser')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

function normalizeProjectJobNumber(raw) {
  if (raw == null) return ''
  let s = String(raw).trim().replace(/^#+/u, '')
  if (!s) return ''
  if (/^E/i.test(s)) return `E${s.replace(/^E/i, '').replace(/^#+/u, '')}`
  return `E${s}`
}

function cleanQuoteRow(data) {
  return {
    quoteNumber: data['Quote Num.']?.trim() || data['Quote Num']?.trim() || data['Quote Number']?.trim() || '',
    customerName: data['Customer']?.trim() || 'Unknown',
    customerContact: data['Cust. Contact']?.trim() || '',
    description: data['Description']?.trim() || '',
    startDate: data['Start Date']?.trim() || null,
    dueDate: data['Due Date']?.trim() || null,
    maturityDate: data['Maturity Date']?.trim() || null,
    quoteStatus: data['Quote Status']?.trim() || 'DRAFT',
    inLDrive: data['In L Drive']?.trim() === 'Yes',
  }
}

function cleanProjectRow(data) {
  return {
    projectNumber: data['Project Number']?.trim() || data['Job Number']?.trim() || '',
    associatedJobs: data['Associated Jobs']?.trim() || '',
    customerName: data['Customer']?.trim() || 'Unknown',
    customerContact: data['Cust. Contact']?.trim() || '',
    description: data['Description']?.trim() || '',
    startDate: data['Start Date']?.trim() || null,
    dueDate: data['Due Date']?.trim() || null,
    jobStatus: data['Job Status']?.trim() || 'ACTIVE',
    quoteNum: data['Quote Num']?.trim() || data['Quote Num.']?.trim() || '',
  }
}

function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '' || dateStr === 'N/A') return null
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return null
    return date
  } catch {
    return null
  }
}

/** Map CSV text to Prisma QuoteStatus */
function mapQuoteStatusEnum(s) {
  const x = (s || '').trim().toUpperCase()
  const map = {
    DRAFT: 'DRAFT',
    'NOT ACCEPTED': 'CANCELLED',
    ACCEPTED: 'APPROVED',
    'PO RECEIVED': 'WON',
    SENT: 'SENT',
    EXPIRED: 'LOST',
    APPROVED: 'APPROVED',
    CANCELLED: 'CANCELLED',
    WON: 'WON',
    LOST: 'LOST',
  }
  return map[x] || 'DRAFT'
}

function mapProjectJobStatus(s) {
  const x = (s || '').trim().toUpperCase()
  const map = {
    BILLED: 'COMPLETED',
    CLOSED: 'COMPLETED',
    ACTIVE: 'ACTIVE',
    'ON HOLD': 'ON_HOLD',
    CANCELLED: 'CANCELLED',
    COMPLETED: 'COMPLETED',
  }
  return map[x] || 'ACTIVE'
}

async function findOrCreateCustomer(customerName, customerContact) {
  if (!customerName || customerName.trim() === '') return null
  let customer = await prisma.customer.findFirst({ where: { name: customerName } })
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        name: customerName,
        phone: customerContact || null,
        email: null,
        address: null,
        isActive: true,
      },
    })
    console.log(`   ✅ Customer: ${customerName}`)
  }
  return customer
}

async function getAdminUser() {
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  if (!adminUser) throw new Error('No admin user found. Run make-admin or setup first.')
  return adminUser
}

async function loadCsvRows(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`   ⚠️  File not found: ${filePath}`)
    return []
  }
  const rows = []
  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', resolve)
      .on('error', reject)
  })
  return rows
}

async function importQuotes(rows, adminUser) {
  let created = 0
  for (const row of rows) {
    const clean = cleanQuoteRow(row)
    if (!clean.quoteNumber) continue
    try {
      const existing = await prisma.quote.findUnique({ where: { quoteNumber: clean.quoteNumber } })
      if (existing) continue
      const customer = await findOrCreateCustomer(clean.customerName, clean.customerContact)
      if (!customer) continue
      await prisma.quote.create({
        data: {
          quoteNumber: clean.quoteNumber,
          title: clean.description || `Quote ${clean.quoteNumber}`,
          description: clean.description || null,
          customerId: customer.id,
          amount: 0,
          status: mapQuoteStatusEnum(clean.quoteStatus),
          validUntil: parseDate(clean.maturityDate),
        },
      })
      created++
    } catch (e) {
      console.error(`   ❌ Quote ${clean.quoteNumber}:`, e.message)
    }
  }
  return created
}

async function importProjects(rows, adminUser) {
  let created = 0
  for (const row of rows) {
    const clean = cleanProjectRow(row)
    const jobNumber = normalizeProjectJobNumber(clean.projectNumber)
    if (!jobNumber) continue
    try {
      const existing = await prisma.job.findFirst({ where: { jobNumber } })
      if (existing) continue
      const customer = await findOrCreateCustomer(clean.customerName, clean.customerContact)
      if (!customer) continue
      await prisma.job.create({
        data: {
          jobNumber,
          title: clean.description || `Job ${jobNumber}`,
          description: clean.description || null,
          type: 'JOB',
          status: mapProjectJobStatus(clean.jobStatus),
          priority: 'MEDIUM',
          startDate: parseDate(clean.startDate),
          endDate: parseDate(clean.dueDate),
          estimatedHours: null,
          actualHours: null,
          assignedToId: null,
          createdById: adminUser.id,
          customerId: customer.id,
          workCode: clean.associatedJobs || null,
          estimatedCost: null,
          dueTodayPercent: null,
          inQuickBooks: false,
          inLDrive: false,
        },
      })
      created++
    } catch (e) {
      console.error(`   ❌ Job ${jobNumber}:`, e.message)
    }
  }
  return created
}

function resolveCsvPath(root, argvPath, envKey, fileName) {
  if (argvPath) return argvPath
  const fromEnv = process.env[envKey]
  if (fromEnv) return fromEnv
  const inImport = path.join(root, 'data', 'import', fileName)
  const inRoot = path.join(root, fileName)
  if (fs.existsSync(inImport)) return inImport
  if (fs.existsSync(inRoot)) return inRoot
  return inRoot
}

async function main() {
  const root = path.join(__dirname, '..')
  const quotesPath = resolveCsvPath(
    root,
    process.argv[2],
    'JOBLIST_QUOTES_CSV',
    'JobList(Quotes).csv'
  )
  const projectsPath = resolveCsvPath(
    root,
    process.argv[3],
    'JOBLIST_PROJECTS_CSV',
    'JobList(Projects).csv'
  )

  console.log('📥 Job list CSV import')
  console.log(`   Quotes file: ${quotesPath}`)
  console.log(`   Projects file: ${projectsPath}\n`)

  const adminUser = await getAdminUser()
  console.log(`👤 Admin: ${adminUser.email}\n`)

  const quoteRows = await loadCsvRows(quotesPath)
  const projectRows = await loadCsvRows(projectsPath)

  console.log(`📋 Quotes CSV rows: ${quoteRows.length}`)
  const qCreated = await importQuotes(quoteRows, adminUser)
  console.log(`   Created quotes: ${qCreated}\n`)

  console.log(`🏗️  Projects CSV rows: ${projectRows.length}`)
  const jCreated = await importProjects(projectRows, adminUser)
  console.log(`   Created jobs: ${jCreated}\n`)

  console.log('✅ Import finished.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
