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
    
    // Skip labor codes - preserve fee
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
    throw error;
  }
}

async function runImportJobs() {
  console.log('\n📋 Importing Jobs from CSV...');
  try {
    const { importJobsFromCSV } = require('./import-jobs-from-csv');
    await importJobsFromCSV();
    console.log('✅ Jobs import completed');
  } catch (error) {
    console.error('❌ Jobs import failed:', error);
    throw error;
  }
}

async function runImportQuotes() {
  console.log('\n💰 Importing Quotes from CSV...');
  try {
    const { importQuotesFromCSV } = require('./import-quotes-from-csv');
    await importQuotesFromCSV();
    console.log('✅ Quotes import completed');
  } catch (error) {
    console.error('❌ Quotes import failed:', error);
    throw error;
  }
}

async function verifyImport() {
  console.log('\n🔍 Verifying import results...');
  
  try {
    const jobCount = await prisma.job.count();
    const quoteCount = await prisma.quote.count();
    const customerCount = await prisma.customer.count();
    const userCount = await prisma.user.count();
    const laborCodeCount = await prisma.laborCode.count();
    
    console.log('\n=== Final Database Counts ===');
    console.log(`📋 Jobs: ${jobCount}`);
    console.log(`💰 Quotes: ${quoteCount}`);
    console.log(`🏢 Customers: ${customerCount}`);
    console.log(`👥 Users: ${userCount}`);
    console.log(`⚙️  Labor Codes: ${laborCodeCount} (preserved)`);
    
    // Show some examples
    console.log('\n=== Sample Jobs ===');
    const sampleJobs = await prisma.job.findMany({
      take: 5,
      include: { customer: true }
    });
    sampleJobs.forEach(job => {
      console.log(`  - ${job.jobNumber}: ${job.title} (${job.customer?.name || 'No Customer'})`);
    });
    
    console.log('\n=== Sample Quotes ===');
    const sampleQuotes = await prisma.quote.findMany({
      take: 5,
      include: { customer: true }
    });
    sampleQuotes.forEach(quote => {
      console.log(`  - ${quote.quoteNumber}: ${quote.title} (${quote.customer?.name || 'No Customer'})`);
    });
    
  } catch (error) {
    console.error('❌ Error verifying import:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting Complete Data Re-import');
    console.log('====================================');
    console.log('This will:');
    console.log('1. Clear existing jobs, quotes, customers, and time entries');
    console.log('2. Preserve labor codes and employees');
    console.log('3. Import jobs from JobList(Projects).csv');
    console.log('4. Import quotes from JobList(Quotes).csv');
    console.log('5. Verify the results');
    console.log('');
    
    // Step 1: Clear database
    await clearDatabaseSelective();
    
    // Step 2: Import jobs
    await runImportJobs();
    
    // Step 3: Import quotes
    await runImportQuotes();
    
    // Step 4: Verify results
    await verifyImport();
    
    console.log('\n🎉 All imports completed successfully!');
    console.log('Your database now contains separate jobs and quotes as requested.');
    
  } catch (error) {
    console.error('\n❌ Import process failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Handle command line arguments
if (require.main === module) {
  main();
}

module.exports = { main, clearDatabaseSelective, runImportJobs, runImportQuotes, verifyImport };
