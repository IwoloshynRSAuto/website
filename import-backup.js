const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importBackup() {
  try {
    console.log('🔄 Starting database backup import...');
    
    // Check for common backup file locations
    const possibleBackupFiles = [
      'backup.json',
      'database-backup.json',
      'data-export.json',
      'prisma-backup.json',
      'backup/database.json',
      'backup/data.json'
    ];
    
    let backupFile = null;
    for (const file of possibleBackupFiles) {
      if (fs.existsSync(file)) {
        backupFile = file;
        break;
      }
    }
    
    if (!backupFile) {
      console.log('❌ No backup file found. Please place your backup file in one of these locations:');
      possibleBackupFiles.forEach(file => console.log(`   - ${file}`));
      console.log('\nOr run: node import-backup.js <path-to-backup-file>');
      return;
    }
    
    console.log(`📥 Found backup file: ${backupFile}`);
    
    // Read and parse the backup file
    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
    console.log('✅ Backup file loaded successfully');
    
    // Clear existing data (in correct order to respect foreign keys)
    console.log('🗑️  Clearing existing data...');
    await prisma.timeEntry.deleteMany();
    await prisma.timesheetSubmission.deleteMany();
    await prisma.jobLaborEstimate.deleteMany();
    await prisma.engineeringChangeOrder.deleteMany();
    await prisma.quote.deleteMany();
    await prisma.job.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.laborCode.deleteMany();
    await prisma.user.deleteMany();
    console.log('✅ Database cleared');
    
    // Import data in correct order
    let importedCount = 0;
    
    // 1. Import users first
    if (backupData.users && backupData.users.length > 0) {
      console.log(`📥 Importing ${backupData.users.length} users...`);
      for (const user of backupData.users) {
        // Remove password field if it exists (since we removed it from schema)
        const { password, ...userData } = user;
        await prisma.user.create({ data: userData });
        importedCount++;
      }
      console.log(`✅ Imported ${importedCount} users`);
    }
    
    // 2. Import labor codes
    if (backupData.laborCodes && backupData.laborCodes.length > 0) {
      console.log(`📥 Importing ${backupData.laborCodes.length} labor codes...`);
      for (const laborCode of backupData.laborCodes) {
        await prisma.laborCode.create({ data: laborCode });
        importedCount++;
      }
      console.log(`✅ Imported ${backupData.laborCodes.length} labor codes`);
    }
    
    // 3. Import customers
    if (backupData.customers && backupData.customers.length > 0) {
      console.log(`📥 Importing ${backupData.customers.length} customers...`);
      for (const customer of backupData.customers) {
        await prisma.customer.create({ data: customer });
        importedCount++;
      }
      console.log(`✅ Imported ${backupData.customers.length} customers`);
    }
    
    // 4. Import jobs
    if (backupData.jobs && backupData.jobs.length > 0) {
      console.log(`📥 Importing ${backupData.jobs.length} jobs...`);
      for (const job of backupData.jobs) {
        await prisma.job.create({ data: job });
        importedCount++;
      }
      console.log(`✅ Imported ${backupData.jobs.length} jobs`);
    }
    
    // 5. Import quotes
    if (backupData.quotes && backupData.quotes.length > 0) {
      console.log(`📥 Importing ${backupData.quotes.length} quotes...`);
      for (const quote of backupData.quotes) {
        await prisma.quote.create({ data: quote });
        importedCount++;
      }
      console.log(`✅ Imported ${backupData.quotes.length} quotes`);
    }
    
    // 6. Import time entries
    if (backupData.timeEntries && backupData.timeEntries.length > 0) {
      console.log(`📥 Importing ${backupData.timeEntries.length} time entries...`);
      for (const timeEntry of backupData.timeEntries) {
        await prisma.timeEntry.create({ data: timeEntry });
        importedCount++;
      }
      console.log(`✅ Imported ${backupData.timeEntries.length} time entries`);
    }
    
    // 7. Import timesheet submissions
    if (backupData.timesheetSubmissions && backupData.timesheetSubmissions.length > 0) {
      console.log(`📥 Importing ${backupData.timesheetSubmissions.length} timesheet submissions...`);
      for (const submission of backupData.timesheetSubmissions) {
        await prisma.timesheetSubmission.create({ data: submission });
        importedCount++;
      }
      console.log(`✅ Imported ${backupData.timesheetSubmissions.length} timesheet submissions`);
    }
    
    console.log(`\n🎉 Import completed successfully!`);
    console.log(`📊 Total records imported: ${importedCount}`);
    
    // Show summary
    const userCount = await prisma.user.count();
    const jobCount = await prisma.job.count();
    const customerCount = await prisma.customer.count();
    const timeEntryCount = await prisma.timeEntry.count();
    
    console.log(`\n📈 Current database status:`);
    console.log(`   Users: ${userCount}`);
    console.log(`   Jobs: ${jobCount}`);
    console.log(`   Customers: ${customerCount}`);
    console.log(`   Time Entries: ${timeEntryCount}`);
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Check if a specific file was provided as argument
const backupFile = process.argv[2];
if (backupFile) {
  console.log(`📥 Using backup file: ${backupFile}`);
  if (!fs.existsSync(backupFile)) {
    console.error(`❌ File not found: ${backupFile}`);
    process.exit(1);
  }
  // Override the backup file path
  const originalImportBackup = importBackup;
  importBackup = async () => {
    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
    // ... rest of the import logic
  };
}

importBackup();
