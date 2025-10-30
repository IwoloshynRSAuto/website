const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function ensureCustomer() {
  const existing = await prisma.customer.findFirst({ where: { name: 'Acme Manufacturing' } });
  if (existing) return existing;
  return prisma.customer.create({
    data: {
      name: 'Acme Manufacturing',
      email: 'contact@acme.example',
      phone: '555-0001',
      address: '100 Industry Way',
      city: 'Detroit',
      state: 'MI',
      zipCode: '48201',
      country: 'USA',
      isActive: true,
    },
  });
}

async function ensureLaborCodes() {
  const codes = [
    { code: 'ENG', name: 'Engineering', category: 'Design', hourlyRate: 150 },
    { code: 'PRG', name: 'Programming', category: 'Programming', hourlyRate: 160 },
    { code: 'INST', name: 'Installation', category: 'Installation', hourlyRate: 140 },
  ];
  for (const lc of codes) {
    const found = await prisma.laborCode.findUnique({ where: { code: lc.code } });
    if (!found) {
      await prisma.laborCode.create({
        data: {
          code: lc.code,
          name: lc.name,
          category: lc.category,
          hourlyRate: lc.hourlyRate,
          isActive: true,
        },
      });
    }
  }
}

async function ensureAdminUser() {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  return admin; // created already by create-admin.js
}

async function ensureJob(customerId, adminId) {
  const existing = await prisma.job.findFirst({ where: { jobNumber: 'JOB-0001' } });
  if (existing) return existing;
  return prisma.job.create({
    data: {
      jobNumber: 'JOB-0001',
      title: 'Getting Started Project',
      description: 'Seed job for local development',
      customerId,
      createdById: adminId ?? (await prisma.user.findFirst()).id,
      status: 'ACTIVE',
      priority: 'HIGH',
      quotedAmount: 10000,
      pmStage: 'PM010',
      stageProgress: 10,
    },
  });
}

async function main() {
  try {
    const customer = await ensureCustomer();
    await ensureLaborCodes();
    const admin = await ensureAdminUser();
    await ensureJob(customer.id, admin?.id);
    console.log('✅ Minimal seed complete.');
  } catch (e) {
    console.error('❌ Seed failed:', e.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();



