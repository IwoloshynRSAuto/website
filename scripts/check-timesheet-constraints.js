// scripts/check-timesheet-constraints.js
const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  try {
    console.log('=== TimesheetSubmission constraints/indexes ===');
    const res = await prisma.$queryRawUnsafe(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'timesheet_submissions'
      ORDER BY indexname;
    `);
    console.log(JSON.stringify(res, null, 2));
    
    // Also check constraints
    console.log('\n=== TimesheetSubmission constraints ===');
    const constraints = await prisma.$queryRawUnsafe(`
      SELECT 
        conname AS constraint_name,
        contype AS constraint_type,
        pg_get_constraintdef(oid) AS constraint_definition
      FROM pg_constraint
      WHERE conrelid = 'timesheet_submissions'::regclass
      ORDER BY conname;
    `);
    console.log(JSON.stringify(constraints, null, 2));
  } catch (error) {
    console.error('Error checking constraints:', error);
  } finally {
    await prisma.$disconnect();
  }
})();

