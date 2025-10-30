const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyE3948() {
  try {
    const job = await prisma.job.findFirst({
      where: { jobNumber: 'E3948' }
    });
    
    console.log('\n📋 E3948 Status Check:');
    console.log('='.repeat(50));
    console.log('Job Number:', job.jobNumber);
    console.log('Title:', job.title);
    console.log('In QuickBooks:', job.inQuickBooks ? '✅ YES' : '❌ NO');
    console.log('In L Drive:', job.inLDrive ? '✅ YES' : '❌ NO');
    console.log('='.repeat(50));
    
    // Also check a few more jobs
    console.log('\n📊 Sample of other jobs:');
    const samples = await prisma.job.findMany({
      where: {
        OR: [
          { jobNumber: 'E3947' },
          { jobNumber: 'E3946' },
          { jobNumber: 'Q0510' }
        ]
      },
      select: {
        jobNumber: true,
        inQuickBooks: true,
        inLDrive: true
      }
    });
    
    samples.forEach(j => {
      console.log(`  ${j.jobNumber}: QB=${j.inQuickBooks}, L Drive=${j.inLDrive}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyE3948();

