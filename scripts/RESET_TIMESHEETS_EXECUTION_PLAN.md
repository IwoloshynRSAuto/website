# Reset Submitted/Approved Timesheet Submissions - Execution Plan

## Overview
This plan provides step-by-step instructions to reset all TimesheetSubmission records with status "SUBMITTED" or "APPROVED" back to "DRAFT" status without deleting any data.

## What Will Be Reset
- **Status**: SUBMITTED/APPROVED → DRAFT
- **Fields Cleared**:
  - `submittedAt` → NULL
  - `approvedAt` → NULL
  - `approvedById` → NULL
  - `rejectedAt` → NULL (if any exist)
  - `rejectedById` → NULL (if any exist)
  - `rejectionReason` → NULL (if any exist)

## What Will Be Preserved
- ✅ All TimesheetSubmission records (status changed, not deleted)
- ✅ All TimeEntry records (remain linked to submissions)
- ✅ All Timesheet records (attendance/clock-in data)
- ✅ All User, Job, LaborCode, and other data
- ✅ DRAFT and REJECTED submissions remain unchanged

---

## Execution Steps

### Step 1: Backup (Recommended)

**Option A: Database Backup (Recommended)**
```bash
# Create a full database backup
# Adjust the command based on your database type:

# For PostgreSQL:
pg_dump -U your_user -d your_database > backup_before_reset_$(date +%Y%m%d_%H%M%S).sql

# For MySQL:
mysqldump -u your_user -p your_database > backup_before_reset_$(date +%Y%m%d_%H%M%S).sql

# For SQLite:
cp your_database.db backup_before_reset_$(date +%Y%m%d_%H%M%S).db
```

**Option B: Backup Table (Quick)**
```sql
-- Run this SQL to create a backup table of affected records
CREATE TABLE "timesheet_submissions_backup" AS
SELECT * FROM "timesheet_submissions"
WHERE status IN ('SUBMITTED', 'APPROVED');
```

---

### Step 2: Pre-Reset Verification

**Using Prisma/Node.js Script:**
```bash
# The script will automatically show verification before reset
cd /opt/timekeeping-portal
node scripts/reset-submitted-approved-timesheets.js
```

**Using SQL (Manual Verification):**
```sql
-- Count submissions by status
SELECT status, COUNT(*) as count 
FROM "timesheet_submissions"
GROUP BY status
ORDER BY status;

-- Count SUBMITTED/APPROVED (will be reset)
SELECT COUNT(*) as submitted_approved_count 
FROM "timesheet_submissions"
WHERE status IN ('SUBMITTED', 'APPROVED');

-- Count DRAFT/REJECTED (will be preserved)
SELECT COUNT(*) as draft_rejected_count 
FROM "timesheet_submissions"
WHERE status IN ('DRAFT', 'REJECTED');

-- Show sample records to be reset
SELECT id, "userId", "weekStart", "weekEnd", type, status, "submittedAt", "approvedAt"
FROM "timesheet_submissions"
WHERE status IN ('SUBMITTED', 'APPROVED')
ORDER BY "createdAt" DESC
LIMIT 10;
```

**Record the counts:**
- SUBMITTED count: _______
- APPROVED count: _______
- DRAFT count: _______
- REJECTED count: _______
- Total submissions: _______

---

### Step 3: Execute Reset

**Option A: Using Node.js/Prisma Script (Recommended)**
```bash
cd /opt/timekeeping-portal

# Make sure dependencies are installed
npm install

# Run the reset script
node scripts/reset-submitted-approved-timesheets.js
```

The script will:
- Show before/after counts
- Perform the reset in a transaction
- Verify the results
- Display validation results

**Option B: Using SQL Directly**
```sql
-- Connect to your database and run:
UPDATE "timesheet_submissions"
SET 
  status = 'DRAFT',
  "submittedAt" = NULL,
  "approvedAt" = NULL,
  "approvedById" = NULL,
  "rejectedAt" = NULL,
  "rejectedById" = NULL,
  "rejectionReason" = NULL,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE status IN ('SUBMITTED', 'APPROVED');
```

**Option C: Using Prisma Studio (Interactive)**
```bash
# Open Prisma Studio
npx prisma studio

# Navigate to TimesheetSubmission table
# Filter: status IN ('SUBMITTED', 'APPROVED')
# Manually update each record (not recommended for large datasets)
```

---

### Step 4: Post-Reset Verification

**Using Prisma/Node.js Script:**
The script automatically performs verification. Check the output for:
- ✅ All SUBMITTED/APPROVED submissions reset to DRAFT
- ✅ DRAFT count increased by the number of reset submissions
- ✅ All data preserved (no deletions)

**Using SQL (Manual Verification):**
```sql
-- Verify no SUBMITTED/APPROVED remain
SELECT COUNT(*) as remaining_submitted_approved 
FROM "timesheet_submissions"
WHERE status IN ('SUBMITTED', 'APPROVED');
-- Expected: 0

-- Verify DRAFT count increased
SELECT status, COUNT(*) as count 
FROM "timesheet_submissions"
GROUP BY status
ORDER BY status;
-- DRAFT count should = original DRAFT + original SUBMITTED + original APPROVED

-- Verify REJECTED preserved
SELECT COUNT(*) as rejected_count 
FROM "timesheet_submissions"
WHERE status = 'REJECTED';
-- Should match pre-reset count

-- Verify fields are cleared
SELECT id, status, "submittedAt", "approvedAt", "approvedById"
FROM "timesheet_submissions"
WHERE status = 'DRAFT'
  AND ("submittedAt" IS NOT NULL OR "approvedAt" IS NOT NULL OR "approvedById" IS NOT NULL)
LIMIT 10;
-- Expected: 0 rows (all should be NULL)

-- Verify TimeEntries are still linked
SELECT COUNT(*) as linked_timeentries
FROM "time_entries" te
INNER JOIN "timesheet_submissions" ts ON te."submissionId" = ts.id
WHERE ts.status = 'DRAFT';
-- Should include previously SUBMITTED/APPROVED submissions

-- Verify no data was deleted
SELECT COUNT(*) as total_submissions 
FROM "timesheet_submissions";
-- Should match pre-reset total count

-- Summary query
SELECT 
  (SELECT COUNT(*) FROM "timesheet_submissions" WHERE status IN ('SUBMITTED', 'APPROVED')) as remaining_submitted_approved,
  (SELECT COUNT(*) FROM "timesheet_submissions" WHERE status = 'DRAFT') as draft_count,
  (SELECT COUNT(*) FROM "timesheet_submissions" WHERE status = 'REJECTED') as rejected_count,
  (SELECT COUNT(*) FROM "time_entries") as total_timeentries,
  (SELECT COUNT(*) FROM "timesheets") as total_timesheets,
  (SELECT COUNT(*) FROM "users") as total_users,
  (SELECT COUNT(*) FROM "jobs") as total_jobs;
```

**Expected Results:**
- `remaining_submitted_approved` = 0
- `draft_count` = original DRAFT + original SUBMITTED + original APPROVED
- `rejected_count` = original REJECTED (unchanged)
- All other counts should match pre-reset values

---

### Step 5: Verify Application Behavior

After resetting, verify that:
1. **Timesheets are unlocked**: Users can edit timesheets that were previously locked
2. **No approval notifications**: Check that approval notifications are cleared
3. **Submission workflow works**: Users can resubmit timesheets
4. **Data integrity**: All time entries are still linked correctly

**Test Commands:**
```bash
# Check if timesheets are accessible (adjust URL as needed)
curl http://localhost:3000/api/timesheets?userId=USER_ID

# Check submission status
curl http://localhost:3000/api/timesheet-submissions
```

---

## Rollback Plan (If Needed)

If you need to rollback the reset:

**Option A: Restore from Database Backup**
```bash
# For PostgreSQL:
psql -U your_user -d your_database < backup_before_reset_TIMESTAMP.sql

# For MySQL:
mysql -u your_user -p your_database < backup_before_reset_TIMESTAMP.sql

# For SQLite:
cp backup_before_reset_TIMESTAMP.db your_database.db
```

**Option B: Restore from Backup Table**
```sql
-- Restore from backup table (if created)
UPDATE "timesheet_submissions" ts
SET 
  status = b.status,
  "submittedAt" = b."submittedAt",
  "approvedAt" = b."approvedAt",
  "approvedById" = b."approvedById",
  "rejectedAt" = b."rejectedAt",
  "rejectedById" = b."rejectedById",
  "rejectionReason" = b."rejectionReason"
FROM "timesheet_submissions_backup" b
WHERE ts.id = b.id;
```

---

## Troubleshooting

### Issue: Script fails with connection error
**Solution**: Check database connection settings in `.env` file
```bash
# Verify DATABASE_URL is set correctly
cat .env | grep DATABASE_URL
```

### Issue: Permission denied
**Solution**: Ensure database user has UPDATE permissions
```sql
-- Check permissions (PostgreSQL example)
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'timesheet_submissions';
```

### Issue: Some records not reset
**Solution**: Check for case sensitivity or extra whitespace
```sql
-- Check for variations in status values
SELECT DISTINCT status FROM "timesheet_submissions";
```

### Issue: TimeEntries appear unlinked
**Solution**: Verify foreign key relationships
```sql
-- Check for orphaned TimeEntries
SELECT COUNT(*) 
FROM "time_entries" te
LEFT JOIN "timesheet_submissions" ts ON te."submissionId" = ts.id
WHERE te."submissionId" IS NOT NULL AND ts.id IS NULL;
-- Expected: 0
```

---

## Files Reference

- **Node.js Script**: `scripts/reset-submitted-approved-timesheets.js`
- **SQL Script**: `scripts/reset-submitted-approved-timesheets.sql`
- **Execution Plan**: `scripts/RESET_TIMESHEETS_EXECUTION_PLAN.md` (this file)

---

## Summary Checklist

- [ ] Backup created (database or table)
- [ ] Pre-reset verification completed
- [ ] Counts recorded
- [ ] Reset executed (script or SQL)
- [ ] Post-reset verification completed
- [ ] All validations passed
- [ ] Application behavior verified
- [ ] Rollback plan documented (if needed)

---

## Support

If you encounter issues:
1. Check the verification queries to identify the problem
2. Review the script output for error messages
3. Verify database permissions and connectivity
4. Consult the rollback plan if data integrity is compromised

