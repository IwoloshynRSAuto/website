import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Updating Panel_Build category to Panel Build...')
  
  // Find all parts with Panel_Build category
  const parts = await prisma.part.findMany({
    where: {
      category: 'Panel_Build'
    },
    select: {
      id: true,
      partNumber: true,
      category: true
    }
  })

  console.log(`📊 Found ${parts.length} parts with Panel_Build category`)

  if (parts.length === 0) {
    console.log('✅ No parts to update')
    return
  }

  // Update all parts
  const result = await prisma.part.updateMany({
    where: {
      category: 'Panel_Build'
    },
    data: {
      category: 'Panel Build'
    }
  })

  console.log(`✅ Updated ${result.count} parts from Panel_Build to Panel Build`)
  
  // Verify the update
  const verify = await prisma.part.findMany({
    where: {
      category: 'Panel_Build'
    }
  })
  
  if (verify.length === 0) {
    console.log('✅ Verification: All Panel_Build categories have been updated')
  } else {
    console.log(`⚠️  Warning: ${verify.length} parts still have Panel_Build category`)
  }

  // Also check for Panel Build (with space)
  const panelBuildCount = await prisma.part.count({
    where: {
      category: 'Panel Build'
    }
  })
  
  console.log(`📊 Total parts now with "Panel Build" category: ${panelBuildCount}`)
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

