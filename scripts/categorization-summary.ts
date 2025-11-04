import { prisma } from '../lib/prisma'

async function main() {
  const totalParts = await prisma.part.count()
  const categorizedParts = await prisma.part.count({
    where: {
      AND: [
        { category: { not: null } },
        { category: { not: '' } }
      ]
    }
  })
  const uncategorizedParts = await prisma.part.count({
    where: {
      OR: [
        { category: null },
        { category: '' }
      ]
    }
  })

  // Get breakdown by category
  const categoryBreakdown = await prisma.part.groupBy({
    by: ['category'],
    where: {
      AND: [
        { category: { not: null } },
        { category: { not: '' } }
      ]
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

  // Get breakdown by subcategory
  const subcategoryBreakdown = await prisma.part.groupBy({
    by: ['subcategory'],
    where: {
      AND: [
        { subcategory: { not: null } },
        { subcategory: { not: '' } }
      ]
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

  console.log('\n=== PARTS CATEGORIZATION SUMMARY ===\n')
  console.log(`Total Parts: ${totalParts}`)
  console.log(`Categorized: ${categorizedParts} (${((categorizedParts / totalParts) * 100).toFixed(1)}%)`)
  console.log(`Uncategorized: ${uncategorizedParts} (${((uncategorizedParts / totalParts) * 100).toFixed(1)}%)\n`)

  console.log('\n=== BREAKDOWN BY CATEGORY ===\n')
  categoryBreakdown.forEach(cat => {
    console.log(`${cat.category}: ${cat._count.id} parts`)
  })

  console.log('\n=== BREAKDOWN BY SUBCATEGORY (Top 20) ===\n')
  subcategoryBreakdown.slice(0, 20).forEach(sub => {
    console.log(`${sub.subcategory || '(No subcategory)'}: ${sub._count.id} parts`)
  })

  if (uncategorizedParts > 0) {
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
      take: 10
    })

    console.log('\n=== REMAINING UNCATEGORIZED PARTS ===\n')
    uncategorized.forEach(p => {
      console.log(`${p.partNumber} (${p.manufacturer})`)
      console.log(`  Description: ${p.description || 'N/A'}\n`)
    })
  }

  await prisma.$disconnect()
}

main().catch(console.error)

