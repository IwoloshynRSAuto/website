const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearEmployees() {
  try {
    console.log('🗑️  Clearing employee database (users table)...');
    
    // Get count before deletion
    const beforeCount = await prisma.user.count();
    console.log(`📊 Found ${beforeCount} users in database`);
    
    // Delete all users
    const deletedUsers = await prisma.user.deleteMany();
    console.log(`✅ Cleared ${deletedUsers.count} users/employees`);
    
    // Get final counts
    const userCount = await prisma.user.count();
    const jobCount = await prisma.job.count();
    const quoteCount = await prisma.quote.count();
    const customerCount = await prisma.customer.count();
    const laborCodeCount = await prisma.laborCode.count();
    
    console.log('\n📊 Database counts after clearing employees:');
    console.log(`  Users/Employees: ${userCount}`);
    console.log(`  Jobs: ${jobCount}`);
    console.log(`  Quotes: ${quoteCount}`);
    console.log(`  Customers: ${customerCount}`);
    console.log(`  Labor Codes: ${laborCodeCount}`);
    
    console.log('\n✅ Employee database cleared successfully!');
    console.log('💡 You may want to create an admin user before importing data.');
    
  } catch (error) {
    console.error('❌ Error clearing employees:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearEmployees();
