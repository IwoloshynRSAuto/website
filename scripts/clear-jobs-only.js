const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearJobsOnly() {
  try {
    console.log('🗑️  Clearing jobs only (preserving quotes, customers, users, labor codes)...');
    
    // Delete jobs in order to respect foreign key constraints
    const deletedJobs = await prisma.job.deleteMany();
    console.log(`✅ Cleared ${deletedJobs.count} jobs`);
    
    // Get final counts
    const jobCount = await prisma.job.count();
    const quoteCount = await prisma.quote.count();
    const customerCount = await prisma.customer.count();
    const userCount = await prisma.user.count();
    const laborCodeCount = await prisma.laborCode.count();
    
    console.log('\n📊 Database counts after clearing:');
    console.log(`  Jobs: ${jobCount}`);
    console.log(`  Quotes: ${quoteCount}`);
    console.log(`  Customers: ${customerCount}`);
    console.log(`  Users: ${userCount}`);
    console.log(`  Labor Codes: ${laborCodeCount}`);
    
    console.log('\n✅ Jobs cleared successfully!');
    
  } catch (error) {
    console.error('❌ Error clearing jobs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearJobsOnly();
