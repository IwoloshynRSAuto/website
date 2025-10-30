const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearDatabaseSelective() {
  try {
    console.log('🗑️  Clearing database (preserving labor codes and employees)...');
    
    // Delete in order to respect foreign key constraints
    await prisma.timeEntry.deleteMany();
    console.log('✅ Cleared time entries');
    
    await prisma.timesheetSubmission.deleteMany();
    console.log('✅ Cleared timesheet submissions');
    
    // Skip labor codes - preserve them
    console.log('⏭️  Preserving labor codes');
    
    // Clear quotes first (they might reference jobs)
    await prisma.quote.deleteMany();
    console.log('✅ Cleared quotes');
    
    await prisma.job.deleteMany();
    console.log('✅ Cleared jobs');
    
    await prisma.customer.deleteMany();
    console.log('✅ Cleared customers');
    
    // Skip users - preserve employees
    console.log('⏭️  Preserving users/employees');
    
    console.log('🎉 Database cleared successfully (labor codes and employees preserved)!');
    
  } catch (error) {
    console.error('❌ Error clearing database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearDatabaseSelective();
