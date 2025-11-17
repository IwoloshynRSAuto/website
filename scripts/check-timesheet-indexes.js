// scripts/check-timesheet-indexes.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('=== Checking TimesheetSubmission indexes ===\n');
    const indexes = await prisma.$queryRawUnsafe(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'timesheet_submissions'
      ORDER BY indexname;
    `);
    console.log(JSON.stringify(indexes, null, 2));
    
    // Verify the old index is gone
    const oldIndexExists = indexes.some(idx => idx.indexname === 'timesheet_submissions_userId_weekStart_key');
    const newIndexExists = indexes.some(idx => idx.indexname === 'timesheet_submissions_userId_weekStart_type_key');
    
    console.log('\n=== Verification ===');
    console.log('Old index (timesheet_submissions_userId_weekStart_key) exists:', oldIndexExists);
    console.log('New index (timesheet_submissions_userId_weekStart_type_key) exists:', newIndexExists);
    
    if (oldIndexExists) {
      console.error('❌ ERROR: Old index still exists!');
      process.exit(1);
    }
    if (!newIndexExists) {
      console.error('❌ ERROR: New index does not exist!');
      process.exit(1);
    }
    console.log('✅ All checks passed!');
  } catch (error) {
    console.error('Error checking indexes:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();

