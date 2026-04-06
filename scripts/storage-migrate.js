/**
 * Migration script to copy files from local storage to S3
 * 
 * This script:
 * 1. Reads all files from local storage
 * 2. Uploads them to S3 using the storage adapter
 * 3. Updates FileRecord entries with new storage paths/URLs
 * 
 * Usage: node scripts/storage-migrate.js [--dry-run]
 * 
 * Requires:
 * - STORAGE_ADAPTER=s3
 * - S3_ENDPOINT, S3_KEY, S3_SECRET, S3_BUCKET environment variables
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

// Import storage adapter (we'll use dynamic import or require)
let storageAdapter = null

async function initializeStorage() {
  // This will be initialized by the storage module
  // For now, we'll use a simple approach
  const { initializeStorage } = require('../src/lib/storage')
  return initializeStorage()
}

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
        })
      }
    }
  } catch (error) {
    console.error(`Error scanning ${dir}:`, error.message)
  }
  return files
}

/**
 * Determine content type from filename
 */
function getContentType(filename) {
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

async function migrateStorage() {
  try {
    console.log('📦 Starting storage migration (local → S3)...')
    if (DRY_RUN) {
      console.log('⚠️  DRY RUN MODE - No changes will be made')
    }

    // Check environment
    if (process.env.STORAGE_ADAPTER !== 's3') {
      console.error('❌ STORAGE_ADAPTER must be set to "s3" for migration')
      console.error('   Current value:', process.env.STORAGE_ADAPTER || 'not set')
      return
    }

    if (!process.env.S3_ENDPOINT || !process.env.S3_KEY || !process.env.S3_SECRET || !process.env.S3_BUCKET) {
      console.error('❌ Missing S3 configuration. Required: S3_ENDPOINT, S3_KEY, S3_SECRET, S3_BUCKET')
      return
    }

    // Initialize storage adapter
    console.log('🔧 Initializing S3 storage adapter...')
    storageAdapter = await initializeStorage()

    // Test connection
    const health = await storageAdapter.healthCheck()
    if (!health.healthy) {
      console.error('❌ S3 storage health check failed:', health.message)
      return
    }
    console.log('✅ S3 storage is healthy')

    // Scan local storage
    const storageBasePath = process.env.STORAGE_BASE_PATH || path.join(process.cwd(), 'storage')
    console.log(`📁 Scanning local storage: ${storageBasePath}`)

    if (!fs.existsSync(storageBasePath)) {
      console.log('⚠️  Local storage directory does not exist, nothing to migrate')
      return
    }

    const files = await scanDirectory(storageBasePath)
    console.log(`📄 Found ${files.length} files to migrate`)

    let uploaded = 0
    let skipped = 0
    let errors = 0
    let updated = 0

    for (const file of files) {
      try {
        // Check if file already exists in S3
        const exists = await storageAdapter.exists(file.relativePath)
        if (exists) {
          console.log(`⏭️  Skipping (already in S3): ${file.relativePath}`)
          skipped++
          continue
        }

        if (DRY_RUN) {
          console.log(`[DRY RUN] Would upload: ${file.relativePath} (${file.size} bytes)`)
          uploaded++
        } else {
          // Read file
          const buffer = await readFile(file.fullPath)
          const contentType = getContentType(file.relativePath)

          // Upload to S3
          await storageAdapter.upload(file.relativePath, buffer, contentType)
          console.log(`✅ Uploaded: ${file.relativePath}`)
          uploaded++

          // Update FileRecord if it exists
          const fileRecord = await prisma.fileRecord.findFirst({
            where: { storagePath: file.relativePath },
          })

          if (fileRecord) {
            const publicUrl = storageAdapter.getPublicUrl(file.relativePath)
            await prisma.fileRecord.update({
              where: { id: fileRecord.id },
              data: {
                fileUrl: publicUrl || null,
                // Storage path remains the same
              },
            })
            updated++
            console.log(`📝 Updated FileRecord: ${file.relativePath}`)
          }
        }
      } catch (error) {
        console.error(`❌ Error migrating ${file.relativePath}:`, error.message)
        errors++
      }
    }

    console.log('\n📊 Migration Summary:')
    console.log(`   Uploaded: ${uploaded}`)
    console.log(`   Skipped: ${skipped}`)
    console.log(`   Updated: ${updated}`)
    console.log(`   Errors: ${errors}`)
    console.log(`   Total: ${files.length}`)

    if (DRY_RUN) {
      console.log('\n⚠️  This was a dry run. Run without --dry-run to apply changes.')
    } else {
      console.log('\n✅ Migration completed successfully!')
      console.log('⚠️  Remember to:')
      console.log('   1. Verify files are accessible in S3')
      console.log('   2. Update STORAGE_ADAPTER=s3 in production environment')
      console.log('   3. Keep local files as backup until verified')
    }
  } catch (error) {
    console.error('❌ Migration error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run migration
migrateStorage()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })

