import { prisma } from '../lib/prisma'

async function main() {
  const uncategorized = await prisma.part.findMany({
    where: {
      OR: [
        { category: null },
        { category: '' }
      ]
    },
    select: {
      partNumber: true,
      manufacturer: true,
      description: true
    },
    take: 50,
    orderBy: {
      partNumber: 'asc'
    }
  })

  const total = await prisma.part.count({
    where: {
      OR: [
        { category: null },
        { category: '' }
      ]
    }
  })

  console.log(`\nTotal uncategorized parts: ${total}\n`)
  console.log('Sample uncategorized parts:\n')
  uncategorized.forEach(p => {
    console.log(`${p.partNumber} (${p.manufacturer})`)
    console.log(`  Description: ${p.description || 'N/A'}\n`)
  })

  await prisma.$disconnect()
}

main().catch(console.error)

