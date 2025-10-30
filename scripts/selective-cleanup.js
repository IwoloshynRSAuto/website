const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function selectiveCleanup() {
  try {
    console.log('🧹 Starting selective database cleanup...');
    
    // First, let's see what we have
    const userCount = await prisma.user.count();
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    const jobCount = await prisma.job.count();
    const timeEntryCount = await prisma.timeEntry.count();
    const submissionCount = await prisma.timesheetSubmission.count();
    const laborCodeCount = await prisma.laborCode.count();
    
    console.log('📊 Current database state:');
    console.log(`   - Total users: ${userCount}`);
    console.log(`   - Admin users: ${adminCount}`);
    console.log(`   - Jobs: ${jobCount}`);
    console.log(`   - Time entries: ${timeEntryCount}`);
    console.log(`   - Timesheet submissions: ${submissionCount}`);
    console.log(`   - Labor codes: ${laborCodeCount}`);
    
    // Delete time entries first (they reference jobs and users)
    console.log('🗑️  Deleting time entries...');
    const deletedTimeEntries = await prisma.timeEntry.deleteMany();
    console.log(`   ✅ Deleted ${deletedTimeEntries.count} time entries`);
    
    // Delete timesheet submissions
    console.log('🗑️  Deleting timesheet submissions...');
    const deletedSubmissions = await prisma.timesheetSubmission.deleteMany();
    console.log(`   ✅ Deleted ${deletedSubmissions.count} timesheet submissions`);
    
    // Delete jobs
    console.log('🗑️  Deleting jobs...');
    const deletedJobs = await prisma.job.deleteMany();
    console.log(`   ✅ Deleted ${deletedJobs.count} jobs`);
    
    // Delete customers (since jobs are gone)
    console.log('🗑️  Deleting customers...');
    const deletedCustomers = await prisma.customer.deleteMany();
    console.log(`   ✅ Deleted ${deletedCustomers.count} customers`);
    
    // Delete non-admin users
    console.log('🗑️  Deleting non-admin users...');
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        role: {
          not: 'ADMIN'
        }
      }
    });
    console.log(`   ✅ Deleted ${deletedUsers.count} non-admin users`);
    
    // Keep labor codes (don't delete them)
    console.log('✅ Labor codes preserved');
    
    // Final count
    const finalUserCount = await prisma.user.count();
    const finalAdminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    const finalLaborCodeCount = await prisma.laborCode.count();
    
    console.log('🎉 Cleanup completed!');
    console.log('📊 Final database state:');
    console.log(`   - Users remaining: ${finalUserCount} (${finalAdminCount} admins)`);
    console.log(`   - Labor codes: ${finalLaborCodeCount}`);
    console.log(`   - Jobs: 0`);
    console.log(`   - Time entries: 0`);
    console.log(`   - Timesheet submissions: 0`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

selectiveCleanup();
