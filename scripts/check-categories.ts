import { prisma } from '../lib/prisma'

async function main() {
  const sample = await prisma.part.findMany({
    where: { category: { not: null } },
    take: 5,
    select: { partNumber: true, category: true, subcategory: true }
  })
  
  console.log('Sample categorized parts:')
  sample.forEach(p => {
    console.log(`  ${p.partNumber}: ${p.category}${p.subcategory ? ' / ' + p.subcategory : ''}`)
  })
  
  const total = await prisma.part.count()
  const withCategory = await prisma.part.count({ where: { category: { not: null } } })
  
  console.log(`\nTotal: ${total}, With category: ${withCategory}`)
  
  await prisma.$disconnect()
}

main().catch(console.error)

