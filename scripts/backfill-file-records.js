/**
 * Backfill script to create FileRecord entries for existing files in storage
 * 
 * This script:
 * 1. Scans the storage directory for existing files
 * 2. Creates FileRecord entries in the database for each file
 * 3. Links files to quotes/jobs if the filename pattern matches
 * 
 * Usage: node scripts/backfill-file-records.js [--dry-run]
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')
const { promisify } = require('util')

const readdir = promisify(fs.readdir)
const stat = promisify(fs.stat)
const readFile = promisify(fs.readFile)

const prisma = new PrismaClient()

const DRY_RUN = process.argv.includes('--dry-run')

/**
 * Recursively scan directory for files
 */
async function scanDirectory(dir, basePath = '') {
  const files = []
  try {
    const entries = await readdir(dir)
    for (const entry of entries) {
      const fullPath = path.join(dir, entry)
      const relativePath = basePath ? `${basePath}/${entry}` : entry
      const stats = await stat(fullPath)

      if (stats.isDirectory()) {
        const subFiles = await scanDirectory(fullPath, relativePath)
        files.push(...subFiles)
      } else {
        files.push({
          fullPath,
          relativePath,
          size: stats.size,
          modified: stats.mtime,
        })
      }
    }
  } catch (error) {
    console.error(`Error scanning ${dir}:`, error.message)
  }
  return files
}

/**
 * Extract quote number from filename (e.g., quote-Q0001-1234567890.pdf -> Q0001)
 */
function extractQuoteNumber(filename) {
  const match = filename.match(/quote-([A-Z0-9]+)-/)
  return match ? match[1] : null
}

/**
 * Determine file type from extension
 */
function getFileType(filename) {
  const ext = filename.split('.').pop()?.toLowerCase()
  const typeMap = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    txt: 'text/plain',
    json: 'application/json',
  }
  return ext ? typeMap[ext] || 'application/octet-stream' : 'application/octet-stream'
}

/**
 * Find quote by quote number
 */
async function findQuoteByNumber(quoteNumber) {
  try {
    return await prisma.quote.findUnique({
      where: { quoteNumber },
    })
  } catch (error) {
    return null
  }
}

/**
 * Find admin user for createdBy field
 */
async function findAdminUser() {
  try {
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    })
    if (admin) return admin

    // Fallback to first user
    return await prisma.user.findFirst()
  } catch (error) {
    return null
  }
}

async function backfillFileRecords() {
  try {
    console.log('📦 Starting file records backfill...')
    if (DRY_RUN) {
      console.log('⚠️  DRY RUN MODE - No changes will be made')
    }

    const storageBasePath = process.env.STORAGE_BASE_PATH || path.join(process.cwd(), 'storage')
    console.log(`📁 Scanning storage directory: ${storageBasePath}`)

    if (!fs.existsSync(storageBasePath)) {
      console.log('⚠️  Storage directory does not exist, skipping backfill')
      return
    }

    // Scan all files
    const files = await scanDirectory(storageBasePath)
    console.log(`📄 Found ${files.length} files to process`)

    // Get admin user for createdBy
    const adminUser = await findAdminUser()
    if (!adminUser) {
      console.error('❌ No users found in database. Please create a user first.')
      return
    }
    console.log(`👤 Using user: ${adminUser.email} (${adminUser.role})`)

    let created = 0
    let skipped = 0
    let errors = 0

    for (const file of files) {
      try {
        const filename = path.basename(file.relativePath)
        const fileType = getFileType(filename)

        // Check if FileRecord already exists
        const existing = await prisma.fileRecord.findFirst({
          where: { storagePath: file.relativePath },
        })

        if (existing) {
          console.log(`⏭️  Skipping (already exists): ${file.relativePath}`)
          skipped++
          continue
        }

        // Try to link to quote if filename pattern matches
        let linkedQuoteId = null
        const quoteNumber = extractQuoteNumber(filename)
        if (quoteNumber) {
          const quote = await findQuoteByNumber(quoteNumber)
          if (quote) {
            linkedQuoteId = quote.id
            console.log(`🔗 Linking to quote: ${quoteNumber}`)
          }
        }

        if (DRY_RUN) {
          console.log(`[DRY RUN] Would create FileRecord: ${file.relativePath}`)
          created++
        } else {
          await prisma.fileRecord.create({
            data: {
              storagePath: file.relativePath,
              fileName: filename,
              fileType,
              fileSize: file.size,
              createdById: adminUser.id,
              linkedQuoteId,
              metadata: {
                backfilled: true,
                backfilledAt: new Date().toISOString(),
                originalPath: file.fullPath,
              },
            },
          })
          console.log(`✅ Created FileRecord: ${file.relativePath}`)
          created++
        }
      } catch (error) {
        console.error(`❌ Error processing ${file.relativePath}:`, error.message)
        errors++
      }
    }

    console.log('\n📊 Backfill Summary:')
    console.log(`   Created: ${created}`)
    console.log(`   Skipped: ${skipped}`)
    console.log(`   Errors: ${errors}`)
    console.log(`   Total: ${files.length}`)

    if (DRY_RUN) {
      console.log('\n⚠️  This was a dry run. Run without --dry-run to apply changes.')
    } else {
      console.log('\n✅ Backfill completed successfully!')
    }
  } catch (error) {
    console.error('❌ Backfill error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run backfill
backfillFileRecords()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })

