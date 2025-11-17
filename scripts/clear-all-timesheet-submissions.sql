-- ============================================================================
-- Clear All Timesheet Submissions
-- ============================================================================
-- This script deletes ALL TimesheetSubmission records and their linked TimeEntries.
-- This will completely clear the timesheet submission system.
--
-- DELETES:
--   - ALL TimesheetSubmission records (all statuses: DRAFT, SUBMITTED, APPROVED, REJECTED)
--   - ALL TimeEntry records linked to submissions
--
-- PRESERVES:
--   - Timesheet records (attendance/clock-in data)
--   - All User, Job, LaborCode, and other data
-- ============================================================================

-- ============================================================================
-- STEP 1: VERIFICATION - Show what will be deleted
-- ============================================================================
-- Uncomment these queries to preview what will be deleted before running

-- Count all TimesheetSubmission records by status
-- SELECT status, COUNT(*) as count 
-- FROM "timesheet_submissions"
-- GROUP BY status
-- ORDER BY status;

-- Count total TimesheetSubmission records
-- SELECT COUNT(*) as total_submissions 
-- FROM "timesheet_submissions";

-- Count TimeEntry records linked to submissions (will be deleted)
-- SELECT COUNT(*) as linked_timeentries 
-- FROM "time_entries" 
-- WHERE "submissionId" IS NOT NULL;

-- Count TimeEntry records NOT linked to submissions (will be preserved)
-- SELECT COUNT(*) as unlinked_timeentries 
-- FROM "time_entries" 
-- WHERE "submissionId" IS NULL;

-- Show sample TimesheetSubmission records to be deleted
-- SELECT id, "userId", "weekStart", "weekEnd", type, status, "createdAt"
-- FROM "timesheet_submissions"
-- ORDER BY "createdAt" DESC
-- LIMIT 10;

-- ============================================================================
-- STEP 2: BACKUP (Optional but Recommended)
-- ============================================================================
-- Before running the deletion, you may want to create a backup

-- Create backup table for ALL TimesheetSubmissions
-- CREATE TABLE "timesheet_submissions_backup" AS
-- SELECT * FROM "timesheet_submissions";

-- Create backup table for TimeEntries linked to submissions
-- CREATE TABLE "time_entries_backup" AS
-- SELECT * FROM "time_entries"
-- WHERE "submissionId" IS NOT NULL;

-- Verify backups were created
-- SELECT COUNT(*) as backup_submissions FROM "timesheet_submissions_backup";
-- SELECT COUNT(*) as backup_timeentries FROM "time_entries_backup";

-- ============================================================================
-- STEP 3: DELETION - Delete ALL timesheet submissions
-- ============================================================================
-- This will delete all TimesheetSubmission records and their linked TimeEntries

-- Step 3a: Delete ALL TimeEntry records linked to submissions
-- This must be done before deleting TimesheetSubmission records
DELETE FROM "time_entries"
WHERE "submissionId" IS NOT NULL;

-- Step 3b: Delete ALL TimesheetSubmission records
DELETE FROM "timesheet_submissions";

-- ============================================================================
-- STEP 4: VERIFICATION - Confirm what was deleted
-- ============================================================================
-- Uncomment these queries to verify the deletion

-- Verify no TimesheetSubmission records remain
-- SELECT COUNT(*) as remaining_submissions 
-- FROM "timesheet_submissions";
-- Expected: 0

-- Verify no TimeEntry records linked to submissions remain
-- SELECT COUNT(*) as remaining_linked_timeentries 
-- FROM "time_entries" 
-- WHERE "submissionId" IS NOT NULL;
-- Expected: 0

-- Verify TimeEntry records NOT linked to submissions are preserved
-- SELECT COUNT(*) as preserved_unlinked_timeentries 
-- FROM "time_entries" 
-- WHERE "submissionId" IS NULL;
-- This should match the count from STEP 1

-- Verify Timesheet records are preserved
-- SELECT COUNT(*) as preserved_timesheets FROM "timesheets";
-- This should show the count of preserved attendance records

-- Verify Users are preserved
-- SELECT COUNT(*) as preserved_users FROM "users";
-- This should show the count of preserved users

-- Verify Jobs are preserved
-- SELECT COUNT(*) as preserved_jobs FROM "jobs";
-- This should show the count of preserved jobs

-- Summary verification query
-- SELECT 
--   (SELECT COUNT(*) FROM "timesheet_submissions") as remaining_submissions,
--   (SELECT COUNT(*) FROM "time_entries" WHERE "submissionId" IS NOT NULL) as remaining_linked_timeentries,
--   (SELECT COUNT(*) FROM "time_entries" WHERE "submissionId" IS NULL) as preserved_unlinked_timeentries,
--   (SELECT COUNT(*) FROM "timesheets") as timesheet_count,
--   (SELECT COUNT(*) FROM "users") as user_count,
--   (SELECT COUNT(*) FROM "jobs") as job_count;

-- ============================================================================
-- NOTES:
-- ============================================================================
-- - This script deletes ALL timesheet submissions regardless of status
-- - This script deletes ALL TimeEntry records linked to submissions
-- - TimeEntry records without submissionId are preserved
-- - Base timesheet/attendance records (Timesheet model) are NOT affected
-- - All other data (Users, Jobs, LaborCodes, etc.) is preserved
-- - Run verification queries before and after to confirm expected behavior
-- - Consider creating a backup before running the deletion (see STEP 2)
-- - After running this, all attendance/time approval pages will be empty
-- ============================================================================

