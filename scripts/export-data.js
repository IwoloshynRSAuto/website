const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function exportData() {
  try {
    console.log('📤 Exporting database...');
    
    const exportData = {
      users: await prisma.user.findMany(),
      customers: await prisma.customer.findMany(),
      jobs: await prisma.job.findMany(),
      quotes: await prisma.quote.findMany(),
      laborCodes: await prisma.laborCode.findMany(),
      timeEntries: await prisma.timeEntry.findMany(),
      timesheetSubmissions: await prisma.timesheetSubmission.findMany(),
      exportDate: new Date().toISOString()
    };
    
    const filename = `database-export-${new Date().toISOString().split('T')[0]}.json`;
    const filepath = path.join(__dirname, '..', 'exports', filename);
    
    // Create exports directory if it doesn't exist
    const exportsDir = path.dirname(filepath);
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }
    
    fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2));
    
    console.log(`✅ Data exported to: ${filepath}`);
    console.log(`📊 Exported:`);
    console.log(`   - ${exportData.users.length} users`);
    console.log(`   - ${exportData.customers.length} customers`);
    console.log(`   - ${exportData.jobs.length} jobs`);
    console.log(`   - ${exportData.quotes.length} quotes`);
    console.log(`   - ${exportData.laborCodes.length} labor codes`);
    console.log(`   - ${exportData.timeEntries.length} time entries`);
    console.log(`   - ${exportData.timesheetSubmissions.length} timesheet submissions`);
    
  } catch (error) {
    console.error('❌ Error exporting data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

exportData();
