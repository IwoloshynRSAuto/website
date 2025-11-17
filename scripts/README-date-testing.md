# Date Testing Scripts

This directory contains scripts for testing and validating date handling in the timekeeping portal APIs.

## Scripts

### 1. `validate-date-logic.js`

**Purpose:** Validates date logic in APIs without requiring a running server. Tests date parsing, week boundaries, UTC normalization, and database persistence.

**Usage:**
```bash
node scripts/validate-date-logic.js
```

**What it tests:**
- Date parsing logic (YYYY-MM-DD and ISO formats)
- Week boundary calculations (Sunday-Saturday)
- Date range query logic
- Date persistence in database
- UTC normalization
- Date validation rules

**Output:**
- ✅ Passed tests
- ❌ Failed tests
- ⚠️  Warnings
- Summary with counts

**Requirements:**
- Database connection (Prisma)
- No running server needed

---

### 2. `test-date-handling.js`

**Purpose:** End-to-end date testing with actual API calls. Requires a running development server.

**Usage:**
```bash
# Set environment variables (optional)
export TEST_USER_ID=your-user-id
export API_URL=http://localhost:3000

# Run the tests
node scripts/test-date-handling.js
```

**Environment Variables:**
- `TEST_USER_ID`: User ID to use for testing (default: example ID from script)
- `API_URL`: Base URL for API (default: http://localhost:3000)

**What it tests:**
- Date parsing in timesheet creation API
- Date persistence in timesheet submission API
- Date range queries
- Week boundary validation
- Date consistency across views
- Timezone handling

**Output:**
- ✅ Passed tests
- ❌ Failed tests
- ⚠️  Warnings
- Detailed summary

**Requirements:**
- Running development server (`npm run dev`)
- Database connection
- Valid test user ID

---

## Running Tests

### Quick Validation (No Server)
```bash
# Just validate the backend logic
node scripts/validate-date-logic.js
```

### Full End-to-End Tests (Server Required)
```bash
# Terminal 1: Start the server
npm run dev

# Terminal 2: Run tests
TEST_USER_ID=your-user-id node scripts/test-date-handling.js
```

### Both Tests
```bash
# Run validation first
node scripts/validate-date-logic.js

# Then run end-to-end tests (with server running)
TEST_USER_ID=your-user-id node scripts/test-date-handling.js
```

---

## Test Results

Document test results in: `docs/date-validation-test-results.md`

The template includes:
- Test execution tracking
- Results for each API endpoint
- Test case documentation
- Known issues tracking
- Recommendations

---

## Troubleshooting

### "User not found" errors
- Make sure `TEST_USER_ID` is set to a valid user ID from your database
- Check that the user exists: `SELECT id FROM "User" LIMIT 1;`

### "Connection refused" errors
- Make sure the development server is running
- Check that `API_URL` is correct (default: http://localhost:3000)

### "Database connection" errors
- Make sure your database is running
- Check your `.env` file for correct database connection string
- Run `npx prisma generate` if needed

### Date parsing errors
- Check that dates are in valid format (YYYY-MM-DD or ISO string)
- Verify timezone handling is correct
- Check server logs for detailed error messages

---

## Expected Results

### validate-date-logic.js
- All date parsing tests should pass
- Week boundary calculations should be correct
- UTC normalization should work
- Database persistence should be validated

### test-date-handling.js
- Date parsing should work for all formats
- Dates should persist correctly
- Date range queries should filter correctly
- Week boundaries should be validated
- Dates should be consistent across views

---

## Notes

- Both scripts use Prisma for database access
- The end-to-end test script makes actual HTTP requests
- Test results are logged to console
- Failed tests will cause the script to exit with code 1
- Warnings don't cause script failure but should be reviewed

