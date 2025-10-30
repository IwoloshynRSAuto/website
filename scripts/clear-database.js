const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearDatabase() {
  try {
    console.log('🗑️  Clearing database...');
    
    // Delete in order to respect foreign key constraints
    await prisma.timeEntry.deleteMany();
    console.log('✅ Cleared time entries');
    
    await prisma.timesheetSubmission.deleteMany();
    console.log('✅ Cleared timesheet submissions');
    
    await prisma.laborCode.deleteMany();
    console.log('✅ Cleared labor codes');
    
    await prisma.job.deleteMany();
    console.log('✅ Cleared jobs');
    
    await prisma.customer.deleteMany();
    console.log('✅ Cleared customers');
    
    await prisma.user.deleteMany();
    console.log('✅ Cleared users');
    
    console.log('🎉 Database cleared successfully!');
    
  } catch (error) {
    console.error('❌ Error clearing database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearDatabase();
