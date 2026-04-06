/**
 * Migration script to populate task codes from static file to database
 * Run with: npx tsx scripts/migrate-task-codes.ts
 */

import { PrismaClient } from '@prisma/client'
import { TASK_CODES } from '../src/lib/task-codes'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting task codes migration...')
  
  let created = 0
  let skipped = 0
  let errors = 0

  for (const taskCode of TASK_CODES) {
    try {
      await prisma.taskCode.upsert({
        where: { code: taskCode.code },
        update: {
          description: taskCode.description,
          category: taskCode.category,
          isActive: true,
        },
        create: {
          code: taskCode.code,
          description: taskCode.description,
          category: taskCode.category,
          isActive: true,
        },
      })
      created++
      console.log(`✓ Created/Updated: ${taskCode.code}`)
    } catch (error: any) {
      if (error.code === 'P2002') {
        skipped++
        console.log(`⊘ Skipped (already exists): ${taskCode.code}`)
      } else {
        errors++
        console.error(`✗ Error with ${taskCode.code}:`, error.message)
      }
    }
  }

  console.log('\nMigration complete!')
  console.log(`Created/Updated: ${created}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Errors: ${errors}`)
}

main()
  .catch((e) => {
    console.error('Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

