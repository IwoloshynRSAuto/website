import { prisma } from '../lib/prisma'

async function main() {
  // Get a sample of parts to verify categories
  const sampleParts = await prisma.part.findMany({
    take: 20,
    select: {
      partNumber: true,
      manufacturer: true,
      description: true,
      category: true,
      subcategory: true
    },
    orderBy: {
      partNumber: 'asc'
    }
  })

  console.log('\n=== Sample Parts from Database ===\n')
  sampleParts.forEach(p => {
    console.log(`${p.partNumber} (${p.manufacturer})`)
    console.log(`  Category: ${p.category || 'NULL'}`)
    console.log(`  Subcategory: ${p.subcategory || 'NULL'}`)
    console.log(`  Description: ${p.description || 'N/A'}`)
    console.log('')
  })

  // Count parts with and without categories
  const total = await prisma.part.count()
  const withCategory = await prisma.part.count({
    where: {
      AND: [
        { category: { not: null } },
        { category: { not: '' } }
      ]
    }
  })
  const withoutCategory = await prisma.part.count({
    where: {
      OR: [
        { category: null },
        { category: '' }
      ]
    }
  })

  console.log(`\n=== Statistics ===`)
  console.log(`Total parts: ${total}`)
  console.log(`With category: ${withCategory}`)
  console.log(`Without category: ${withoutCategory}`)

  await prisma.$disconnect()
}

main().catch(console.error)

