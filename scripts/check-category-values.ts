import { prisma } from '../lib/prisma'

async function main() {
  const categories = await prisma.part.groupBy({
    by: ['category'],
    where: {
      category: { not: null }
    },
    _count: {
      id: true
    },
    orderBy: {
      _count: {
        id: 'desc'
      }
    }
  })

  console.log('\n=== Categories in Database ===\n')
  categories.forEach(cat => {
    console.log(`"${cat.category}": ${cat._count.id} parts`)
  })

  await prisma.$disconnect()
}

main().catch(console.error)

