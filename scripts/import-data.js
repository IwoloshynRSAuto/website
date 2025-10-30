const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importData(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      return;
    }
    
    console.log(`📥 Importing data from: ${filePath}`);
    
    const importData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Clear existing data first
    console.log('🗑️  Clearing existing data...');
    await prisma.timeEntry.deleteMany();
    await prisma.timesheetSubmission.deleteMany();
    await prisma.laborCode.deleteMany();
    await prisma.job.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.user.deleteMany();
    
    // Import in order to respect foreign key constraints
    if (importData.users && importData.users.length > 0) {
      console.log(`📥 Importing ${importData.users.length} users...`);
      for (const user of importData.users) {
        await prisma.user.create({ data: user });
      }
    }
    
    if (importData.customers && importData.customers.length > 0) {
      console.log(`📥 Importing ${importData.customers.length} customers...`);
      for (const customer of importData.customers) {
        await prisma.customer.create({ data: customer });
      }
    }
    
    if (importData.laborCodes && importData.laborCodes.length > 0) {
      console.log(`📥 Importing ${importData.laborCodes.length} labor codes...`);
      for (const laborCode of importData.laborCodes) {
        await prisma.laborCode.create({ data: laborCode });
      }
    }
    
    if (importData.jobs && importData.jobs.length > 0) {
      console.log(`📥 Importing ${importData.jobs.length} jobs...`);
      for (const job of importData.jobs) {
        await prisma.job.create({ data: job });
      }
    }
    
    if (importData.timesheetSubmissions && importData.timesheetSubmissions.length > 0) {
      console.log(`📥 Importing ${importData.timesheetSubmissions.length} timesheet submissions...`);
      for (const submission of importData.timesheetSubmissions) {
        await prisma.timesheetSubmission.create({ data: submission });
      }
    }
    
    if (importData.timeEntries && importData.timeEntries.length > 0) {
      console.log(`📥 Importing ${importData.timeEntries.length} time entries...`);
      for (const timeEntry of importData.timeEntries) {
        await prisma.timeEntry.create({ data: timeEntry });
      }
    }
    
    console.log('🎉 Data imported successfully!');
    
  } catch (error) {
    console.error('❌ Error importing data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get file path from command line argument
const filePath = process.argv[2];
if (!filePath) {
  console.log('Usage: node import-data.js <path-to-export-file>');
  console.log('Example: node import-data.js exports/database-export-2024-01-20.json');
  process.exit(1);
}

importData(filePath);
