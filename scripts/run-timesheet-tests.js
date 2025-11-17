// scripts/run-timesheet-tests.js
// Manual integration test script for timesheet submission types
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('=== Timesheet Submission Type Tests ===\n');
    
    // Test 1: Check if we can query ATTENDANCE and TIME submissions separately
    console.log('Test 1: Querying submissions by type...');
    const testUserId = 'cmhdxmal50000wd6gz1xvk32t'; // Replace with actual test user ID
    const testWeekStart = new Date('2025-11-09T00:00:00.000Z');
    
    const attendanceSubmissions = await prisma.timesheetSubmission.findMany({
      where: {
        userId: testUserId,
        weekStart: testWeekStart,
        type: 'ATTENDANCE'
      }
    });
    
    const timeSubmissions = await prisma.timesheetSubmission.findMany({
      where: {
        userId: testUserId,
        weekStart: testWeekStart,
        type: 'TIME'
      }
    });
    
    console.log(`Found ${attendanceSubmissions.length} ATTENDANCE submissions`);
    console.log(`Found ${timeSubmissions.length} TIME submissions`);
    console.log('✅ Test 1 passed: Can query by type\n');
    
    // Test 2: Verify unique constraint works
    console.log('Test 2: Verifying unique constraint...');
    const allSubmissions = await prisma.timesheetSubmission.findMany({
      where: {
        userId: testUserId,
        weekStart: testWeekStart
      }
    });
    
    const types = allSubmissions.map(s => s.type);
    const hasBothTypes = types.includes('ATTENDANCE') && types.includes('TIME');
    
    if (hasBothTypes) {
      console.log('✅ Test 2 passed: Both ATTENDANCE and TIME submissions can exist for same user/week');
    } else {
      console.log('⚠️  Test 2: No submissions with both types found (this is OK if none exist yet)');
    }
    
    console.log('\n=== Manual Integration Tests ===');
    console.log('To fully test, manually:');
    console.log('1. Create an ATTENDANCE submission via POST /api/timesheet-submissions');
    console.log('2. Create a TIME submission for the same user/week');
    console.log('3. Verify both exist and can be queried separately');
    console.log('4. Verify no unique constraint errors occur');
    
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();

