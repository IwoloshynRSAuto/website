const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function exportBackup() {
  try {
    console.log('📤 Starting database export...');
    
    // Export all data
    const users = await prisma.user.findMany();
    const customers = await prisma.customer.findMany();
    const jobs = await prisma.job.findMany();
    const quotes = await prisma.quote.findMany();
    const laborCodes = await prisma.laborCode.findMany();
    const timeEntries = await prisma.timeEntry.findMany();
    const timesheetSubmissions = await prisma.timesheetSubmission.findMany();
    const jobLaborEstimates = await prisma.jobLaborEstimate.findMany();
    const engineeringChangeOrders = await prisma.engineeringChangeOrder.findMany();
    const partsServices = await prisma.partsService.findMany();
    
    const backupData = {
      users,
      customers,
      jobs,
      quotes,
      laborCodes,
      timeEntries,
      timesheetSubmissions,
      jobLaborEstimates,
      engineeringChangeOrders,
      partsServices,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `backup-${timestamp}.json`;
    
    fs.writeFileSync(filename, JSON.stringify(backupData, null, 2));
    
    console.log(`✅ Backup exported successfully to: ${filename}`);
    console.log(`📊 Records exported:`);
    console.log(`   Users: ${users.length}`);
    console.log(`   Customers: ${customers.length}`);
    console.log(`   Jobs: ${jobs.length}`);
    console.log(`   Quotes: ${quotes.length}`);
    console.log(`   Labor Codes: ${laborCodes.length}`);
    console.log(`   Time Entries: ${timeEntries.length}`);
    console.log(`   Timesheet Submissions: ${timesheetSubmissions.length}`);
    console.log(`   Job Labor Estimates: ${jobLaborEstimates.length}`);
    console.log(`   Engineering Change Orders: ${engineeringChangeOrders.length}`);
    console.log(`   Parts Services: ${partsServices.length}`);
    
  } catch (error) {
    console.error('❌ Export failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

exportBackup();
