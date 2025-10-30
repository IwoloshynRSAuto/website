const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedLaborCodes() {
  const codes = [
    { code: 'ENG', name: 'Engineering', category: 'Design', hourlyRate: 150 },
    { code: 'PRG', name: 'Programming', category: 'Programming', hourlyRate: 160 },
    { code: 'INST', name: 'Installation', category: 'Installation', hourlyRate: 140 },
    { code: 'COMM', name: 'Commissioning', category: 'Commissioning', hourlyRate: 155 },
    { code: 'TRN', name: 'Training', category: 'Training', hourlyRate: 130 },
  ];

  let created = 0;
  for (const c of codes) {
    const existing = await prisma.laborCode.findUnique({ where: { code: c.code } });
    if (!existing) {
      await prisma.laborCode.create({
        data: {
          code: c.code,
          name: c.name,
          category: c.category,
          hourlyRate: c.hourlyRate,
          isActive: true,
        },
      });
      created += 1;
    }
  }

  const total = await prisma.laborCode.count();
  console.log(`✅ Labor codes seeded. Created: ${created}. Total: ${total}.`);
}

async function main() {
  try {
    await seedLaborCodes();
  } catch (e) {
    console.error('❌ Seeding labor codes failed:', e.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();



