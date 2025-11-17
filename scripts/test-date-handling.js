/**
 * End-to-end date handling test script
 * Tests date selection, submission, and persistence across all timekeeping APIs
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Test configuration
const TEST_USER_ID = process.env.TEST_USER_ID || 'cmhdxmal50000wd6gz1xvk32t' // Replace with actual test user ID
const BASE_URL = process.env.API_URL || 'http://localhost:3000'

// Test results tracking
const testResults = {
  passed: [],
  failed: [],
  warnings: []
}

/**
 * Helper to make API requests
 */
async function apiRequest(method, endpoint, body = null) {
  const url = `${BASE_URL}${endpoint}`
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  }
  
  if (body) {
    options.body = JSON.stringify(body)
  }
  
  try {
    const response = await fetch(url, options)
    const data = await response.json()
    return { status: response.status, data }
  } catch (error) {
    return { status: 500, error: error.message }
  }
}

/**
 * Test date formatting utilities
 */
function formatDateForAPI(date) {
  // Format as YYYY-MM-DD
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateTimeForAPI(date) {
  return date.toISOString()
}

/**
 * Get week boundaries for a date (Sunday-Saturday)
 */
function getWeekBoundaries(date) {
  const day = date.getDay()
  const diff = date.getDate() - day // Get Sunday of this week
  const weekStart = new Date(date.setDate(diff))
  weekStart.setHours(0, 0, 0, 0)
  
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)
  
  return { weekStart, weekEnd }
}

/**
 * Test 1: Test date parsing in timesheet creation API
 */
async function testDateParsing() {
  console.log('\n=== Test 1: Date Parsing in Timesheet Creation ===')
  
  const testDates = [
    { input: '2025-01-15', description: 'YYYY-MM-DD format' },
    { input: new Date('2025-01-15T12:00:00Z').toISOString(), description: 'ISO string format' },
    { input: new Date('2025-01-15T00:00:00-06:00').toISOString(), description: 'ISO with timezone' }
  ]
  
  for (const testCase of testDates) {
    try {
      const testDate = new Date(testCase.input)
      const clockInTime = new Date(testDate)
      clockInTime.setHours(8, 0, 0, 0)
      
      const clockOutTime = new Date(testDate)
      clockOutTime.setHours(17, 0, 0, 0)
      
      const response = await apiRequest('POST', '/api/timesheets', {
        date: testCase.input,
        clockInTime: clockInTime.toISOString(),
        clockOutTime: clockOutTime.toISOString()
      })
      
      if (response.status === 200 || response.status === 201) {
        testResults.passed.push(`Date parsing: ${testCase.description}`)
        console.log(`✅ ${testCase.description}: PASSED`)
      } else {
        testResults.failed.push(`Date parsing: ${testCase.description} - ${response.data?.error || 'Unknown error'}`)
        console.log(`❌ ${testCase.description}: FAILED - ${response.data?.error || 'Unknown error'}`)
      }
    } catch (error) {
      testResults.failed.push(`Date parsing: ${testCase.description} - ${error.message}`)
      console.log(`❌ ${testCase.description}: ERROR - ${error.message}`)
    }
  }
}

/**
 * Test 2: Test date persistence in timesheet submission
 */
async function testDatePersistence() {
  console.log('\n=== Test 2: Date Persistence in Timesheet Submission ===')
  
  try {
    // Get a test date and its week boundaries
    const testDate = new Date('2025-01-15T12:00:00Z')
    const { weekStart, weekEnd } = getWeekBoundaries(new Date(testDate))
    
    // Create time entries for different days in the week
    const timeEntries = []
    for (let i = 0; i < 7; i++) {
      const entryDate = new Date(weekStart)
      entryDate.setDate(entryDate.getDate() + i)
      
      const clockIn = new Date(entryDate)
      clockIn.setHours(8, 0, 0, 0)
      
      const clockOut = new Date(entryDate)
      clockOut.setHours(17, 0, 0, 0)
      
      timeEntries.push({
        date: entryDate.toISOString(),
        clockInTime: clockIn.toISOString(),
        clockOutTime: clockOut.toISOString(),
        regularHours: 8,
        overtimeHours: 0,
        billable: true
      })
    }
    
    const response = await apiRequest('POST', '/api/timesheet-submissions', {
      userId: TEST_USER_ID,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      timeEntries
    })
    
    if (response.status === 200 || response.status === 201) {
      // Verify dates were persisted correctly
      const submissionId = response.data?.id
      if (submissionId) {
        const submission = await prisma.timesheetSubmission.findUnique({
          where: { id: submissionId },
          include: { timeEntries: true }
        })
        
        if (submission) {
          // Check that week boundaries match
          const weekStartMatch = submission.weekStart.getTime() === weekStart.getTime()
          const weekEndMatch = submission.weekEnd.getTime() === weekEnd.getTime()
          
          if (weekStartMatch && weekEndMatch) {
            testResults.passed.push('Date persistence: Week boundaries preserved')
            console.log('✅ Week boundaries preserved: PASSED')
          } else {
            testResults.failed.push('Date persistence: Week boundaries mismatch')
            console.log('❌ Week boundaries mismatch: FAILED')
          }
          
          // Check that time entry dates are within week
          const allDatesInWeek = submission.timeEntries.every(te => {
            const teDate = new Date(te.date)
            return teDate >= weekStart && teDate <= weekEnd
          })
          
          if (allDatesInWeek) {
            testResults.passed.push('Date persistence: All entry dates within week')
            console.log('✅ All entry dates within week: PASSED')
          } else {
            testResults.failed.push('Date persistence: Some entry dates outside week')
            console.log('❌ Some entry dates outside week: FAILED')
          }
        }
      }
    } else {
      testResults.failed.push(`Date persistence: Submission failed - ${response.data?.error || 'Unknown error'}`)
      console.log(`❌ Submission failed: ${response.data?.error || 'Unknown error'}`)
    }
  } catch (error) {
    testResults.failed.push(`Date persistence: ${error.message}`)
    console.log(`❌ Error: ${error.message}`)
  }
}

/**
 * Test 3: Test date range queries
 */
async function testDateRangeQueries() {
  console.log('\n=== Test 3: Date Range Queries ===')
  
  try {
    const startDate = new Date('2025-01-01')
    const endDate = new Date('2025-01-31')
    
    // Test GET /api/time-entries with date range
    const response = await apiRequest('GET', 
      `/api/time-entries?userId=${TEST_USER_ID}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
    )
    
    if (response.status === 200) {
      const entries = response.data || []
      
      // Verify all entries are within date range
      const allInRange = entries.every(entry => {
        const entryDate = new Date(entry.date)
        return entryDate >= startDate && entryDate <= endDate
      })
      
      if (allInRange) {
        testResults.passed.push('Date range query: All entries in range')
        console.log('✅ All entries in range: PASSED')
      } else {
        testResults.failed.push('Date range query: Some entries outside range')
        console.log('❌ Some entries outside range: FAILED')
      }
      
      // Test with YYYY-MM-DD format
      const response2 = await apiRequest('GET',
        `/api/time-entries?userId=${TEST_USER_ID}&startDate=${formatDateForAPI(startDate)}&endDate=${formatDateForAPI(endDate)}`
      )
      
      if (response2.status === 200) {
        testResults.passed.push('Date range query: YYYY-MM-DD format accepted')
        console.log('✅ YYYY-MM-DD format accepted: PASSED')
      } else {
        testResults.warnings.push('Date range query: YYYY-MM-DD format may not be supported')
        console.log('⚠️  YYYY-MM-DD format may not be supported')
      }
    } else {
      testResults.failed.push(`Date range query: Request failed - ${response.data?.error || 'Unknown error'}`)
      console.log(`❌ Request failed: ${response.data?.error || 'Unknown error'}`)
    }
  } catch (error) {
    testResults.failed.push(`Date range query: ${error.message}`)
    console.log(`❌ Error: ${error.message}`)
  }
}

/**
 * Test 4: Test week boundary validation
 */
async function testWeekBoundaryValidation() {
  console.log('\n=== Test 4: Week Boundary Validation ===')
  
  try {
    const testDate = new Date('2025-01-15') // Wednesday
    const { weekStart, weekEnd } = getWeekBoundaries(testDate)
    
    // Test that API corrects non-Sunday weekStart
    const wrongWeekStart = new Date(testDate)
    wrongWeekStart.setDate(wrongWeekStart.getDate() - 3) // Monday instead of Sunday
    
    const response = await apiRequest('POST', '/api/timesheet-submissions', {
      userId: TEST_USER_ID,
      weekStart: wrongWeekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      timeEntries: [{
        date: testDate.toISOString(),
        clockInTime: new Date(testDate.setHours(8, 0, 0, 0)).toISOString(),
        clockOutTime: new Date(testDate.setHours(17, 0, 0, 0)).toISOString(),
        regularHours: 8,
        overtimeHours: 0
      }]
    })
    
    if (response.status === 200 || response.status === 201) {
      // Check if weekStart was corrected to Sunday
      const submissionId = response.data?.id
      if (submissionId) {
        const submission = await prisma.timesheetSubmission.findUnique({
          where: { id: submissionId }
        })
        
        if (submission && submission.weekStart.getDay() === 0) {
          testResults.passed.push('Week boundary validation: weekStart corrected to Sunday')
          console.log('✅ weekStart corrected to Sunday: PASSED')
        } else {
          testResults.failed.push('Week boundary validation: weekStart not corrected')
          console.log('❌ weekStart not corrected: FAILED')
        }
      }
    } else {
      testResults.warnings.push(`Week boundary validation: ${response.data?.error || 'Unknown error'}`)
      console.log(`⚠️  ${response.data?.error || 'Unknown error'}`)
    }
  } catch (error) {
    testResults.failed.push(`Week boundary validation: ${error.message}`)
    console.log(`❌ Error: ${error.message}`)
  }
}

/**
 * Test 5: Test date consistency across different views
 */
async function testDateConsistency() {
  console.log('\n=== Test 5: Date Consistency Across Views ===')
  
  try {
    // Create a timesheet entry
    const testDate = new Date('2025-01-15T12:00:00Z')
    const clockIn = new Date(testDate)
    clockIn.setHours(8, 0, 0, 0)
    
    const clockOut = new Date(testDate)
    clockOut.setHours(17, 0, 0, 0)
    
    // Create via POST /api/timesheets
    const createResponse = await apiRequest('POST', '/api/timesheets', {
      date: formatDateForAPI(testDate),
      clockInTime: clockIn.toISOString(),
      clockOutTime: clockOut.toISOString()
    })
    
    if (createResponse.status === 200 || createResponse.status === 201) {
      const timesheetId = createResponse.data?.id
      
      if (timesheetId) {
        // Verify the date was stored correctly
        const timesheet = await prisma.timesheet.findUnique({
          where: { id: timesheetId }
        })
        
        if (timesheet) {
          const storedDate = new Date(timesheet.date)
          const expectedDate = new Date(testDate)
          expectedDate.setHours(0, 0, 0, 0)
          storedDate.setHours(0, 0, 0, 0)
          
          if (storedDate.getTime() === expectedDate.getTime()) {
            testResults.passed.push('Date consistency: Date stored correctly')
            console.log('✅ Date stored correctly: PASSED')
          } else {
            testResults.failed.push(`Date consistency: Date mismatch - expected ${expectedDate.toISOString()}, got ${storedDate.toISOString()}`)
            console.log(`❌ Date mismatch: FAILED`)
          }
        }
      }
    }
  } catch (error) {
    testResults.failed.push(`Date consistency: ${error.message}`)
    console.log(`❌ Error: ${error.message}`)
  }
}

/**
 * Test 6: Test timezone handling
 */
async function testTimezoneHandling() {
  console.log('\n=== Test 6: Timezone Handling ===')
  
  try {
    // Test with dates in different timezones
    const testCases = [
      { date: '2025-01-15T00:00:00Z', description: 'UTC midnight' },
      { date: '2025-01-15T00:00:00-06:00', description: 'CST midnight' },
      { date: '2025-01-15T12:00:00Z', description: 'UTC noon' }
    ]
    
    for (const testCase of testCases) {
      const testDate = new Date(testCase.date)
      const clockIn = new Date(testDate)
      clockIn.setHours(8, 0, 0, 0)
      
      const clockOut = new Date(testDate)
      clockOut.setHours(17, 0, 0, 0)
      
      const response = await apiRequest('POST', '/api/timesheets', {
        date: formatDateForAPI(testDate),
        clockInTime: clockIn.toISOString(),
        clockOutTime: clockOut.toISOString()
      })
      
      if (response.status === 200 || response.status === 201) {
        testResults.passed.push(`Timezone handling: ${testCase.description}`)
        console.log(`✅ ${testCase.description}: PASSED`)
      } else {
        testResults.warnings.push(`Timezone handling: ${testCase.description} - ${response.data?.error || 'Unknown error'}`)
        console.log(`⚠️  ${testCase.description}: ${response.data?.error || 'Unknown error'}`)
      }
    }
  } catch (error) {
    testResults.failed.push(`Timezone handling: ${error.message}`)
    console.log(`❌ Error: ${error.message}`)
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('='.repeat(60))
  console.log('Date Handling End-to-End Tests')
  console.log('='.repeat(60))
  console.log(`Test User ID: ${TEST_USER_ID}`)
  console.log(`API URL: ${BASE_URL}`)
  
  try {
    await testDateParsing()
    await testDatePersistence()
    await testDateRangeQueries()
    await testWeekBoundaryValidation()
    await testDateConsistency()
    await testTimezoneHandling()
    
    // Print summary
    console.log('\n' + '='.repeat(60))
    console.log('Test Summary')
    console.log('='.repeat(60))
    console.log(`✅ Passed: ${testResults.passed.length}`)
    console.log(`❌ Failed: ${testResults.failed.length}`)
    console.log(`⚠️  Warnings: ${testResults.warnings.length}`)
    
    if (testResults.failed.length > 0) {
      console.log('\nFailed Tests:')
      testResults.failed.forEach(test => console.log(`  - ${test}`))
    }
    
    if (testResults.warnings.length > 0) {
      console.log('\nWarnings:')
      testResults.warnings.forEach(warning => console.log(`  - ${warning}`))
    }
    
    // Return exit code
    process.exit(testResults.failed.length > 0 ? 1 : 0)
  } catch (error) {
    console.error('Fatal error running tests:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests()
}

module.exports = {
  runAllTests,
  testDateParsing,
  testDatePersistence,
  testDateRangeQueries,
  testWeekBoundaryValidation,
  testDateConsistency,
  testTimezoneHandling
}

