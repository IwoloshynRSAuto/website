-- ============================================================================
-- Reset Submitted/Approved Timesheet Submissions to DRAFT and Delete Rejected Ones
-- ============================================================================
-- This script:
-- 1. Resets TimesheetSubmission records with status "SUBMITTED" or "APPROVED" back to "DRAFT"
-- 2. Deletes TimesheetSubmission records with status "REJECTED" (and their linked TimeEntries)
--
-- PRESERVES:
--   - DRAFT TimesheetSubmission records (unchanged)
--   - All TimeEntry records linked to DRAFT/SUBMITTED/APPROVED submissions
--   - All Timesheet records (attendance/clock-in data)
--   - All User, Job, and other data
--
-- RESETS:
--   - Status: SUBMITTED/APPROVED → DRAFT
--   - submittedAt: cleared (set to null)
--   - approvedAt: cleared (set to null)
--   - approvedById: cleared (set to null)
--
-- DELETES:
--   - REJECTED TimesheetSubmission records
--   - TimeEntry records linked to REJECTED submissions
-- ============================================================================

-- ============================================================================
-- STEP 1: VERIFICATION - Show what will be reset
-- ============================================================================
-- Uncomment these queries to preview what will be reset before running

-- Count TimesheetSubmission records by status
-- SELECT status, COUNT(*) as count 
-- FROM "timesheet_submissions"
-- GROUP BY status
-- ORDER BY status;

-- Count SUBMITTED/APPROVED submissions (will be reset to DRAFT)
-- SELECT COUNT(*) as submitted_approved_count 
-- FROM "timesheet_submissions"
-- WHERE status IN ('SUBMITTED', 'APPROVED');

-- Count REJECTED submissions (will be deleted)
-- SELECT COUNT(*) as rejected_count 
-- FROM "timesheet_submissions"
-- WHERE status = 'REJECTED';

-- Count DRAFT submissions (will be preserved)
-- SELECT COUNT(*) as draft_count 
-- FROM "timesheet_submissions"
-- WHERE status = 'DRAFT';

-- Count TimeEntry records linked to SUBMITTED/APPROVED submissions (will be preserved)
-- SELECT COUNT(*) as linked_to_submitted_approved 
-- FROM "time_entries" te
-- INNER JOIN "timesheet_submissions" ts ON te."submissionId" = ts.id
-- WHERE ts.status IN ('SUBMITTED', 'APPROVED');

-- Count TimeEntry records linked to REJECTED submissions (will be deleted)
-- SELECT COUNT(*) as linked_to_rejected 
-- FROM "time_entries" te
-- INNER JOIN "timesheet_submissions" ts ON te."submissionId" = ts.id
-- WHERE ts.status = 'REJECTED';

-- Count TimeEntry records linked to DRAFT submissions (will be preserved)
-- SELECT COUNT(*) as linked_to_draft 
-- FROM "time_entries" te
-- INNER JOIN "timesheet_submissions" ts ON te."submissionId" = ts.id
-- WHERE ts.status = 'DRAFT';

-- Count TimeEntry records NOT linked to any submission (will be preserved)
-- SELECT COUNT(*) as unlinked_timeentries 
-- FROM "time_entries" 
-- WHERE "submissionId" IS NULL;

-- Show sample SUBMITTED/APPROVED TimesheetSubmission records to be reset
-- SELECT id, "userId", "weekStart", "weekEnd", type, status, "submittedAt", "approvedAt", "createdAt"
-- FROM "timesheet_submissions"
-- WHERE status IN ('SUBMITTED', 'APPROVED')
-- ORDER BY "createdAt" DESC
-- LIMIT 10;

-- Show sample REJECTED TimesheetSubmission records to be deleted
-- SELECT id, "userId", "weekStart", "weekEnd", type, status, "rejectedAt", "rejectionReason", "createdAt"
-- FROM "timesheet_submissions"
-- WHERE status = 'REJECTED'
-- ORDER BY "createdAt" DESC
-- LIMIT 10;

-- Show sample TimeEntry records that will remain linked (preserved - linked to SUBMITTED/APPROVED)
-- SELECT te.id, te.date, te."regularHours", te."overtimeHours", te."submissionId", ts.status, te."createdAt"
-- FROM "time_entries" te
-- INNER JOIN "timesheet_submissions" ts ON te."submissionId" = ts.id
-- WHERE ts.status IN ('SUBMITTED', 'APPROVED')
-- ORDER BY te."createdAt" DESC
-- LIMIT 10;

-- Show sample TimeEntry records that will be deleted (linked to REJECTED)
-- SELECT te.id, te.date, te."regularHours", te."overtimeHours", te."submissionId", ts.status, te."createdAt"
-- FROM "time_entries" te
-- INNER JOIN "timesheet_submissions" ts ON te."submissionId" = ts.id
-- WHERE ts.status = 'REJECTED'
-- ORDER BY te."createdAt" DESC
-- LIMIT 10;

-- ============================================================================
-- STEP 2: BACKUP (Optional but Recommended)
-- ============================================================================
-- Before running the reset, you may want to create a backup of the affected records
-- Uncomment and run these to create backup tables

-- Create backup table for TimesheetSubmissions that will be reset or deleted
-- CREATE TABLE "timesheet_submissions_backup" AS
-- SELECT * FROM "timesheet_submissions"
-- WHERE status IN ('SUBMITTED', 'APPROVED', 'REJECTED');

-- Verify backup was created
-- SELECT COUNT(*) as backup_count FROM "timesheet_submissions_backup";

-- ============================================================================
-- STEP 3: DELETE and RESET - Delete REJECTED, Reset SUBMITTED/APPROVED to DRAFT
-- ============================================================================
-- This will:
-- 1. Delete TimeEntry records linked to REJECTED submissions
-- 2. Delete REJECTED TimesheetSubmission records
-- 3. Reset SUBMITTED/APPROVED submissions to DRAFT and clear related fields

-- Step 3a: Delete TimeEntry records linked to REJECTED submissions
-- This must be done before deleting TimesheetSubmission records
DELETE FROM "time_entries"
WHERE "submissionId" IN (
  SELECT id FROM "timesheet_submissions" 
  WHERE status = 'REJECTED'
);

-- Step 3b: Delete REJECTED TimesheetSubmission records
DELETE FROM "timesheet_submissions"
WHERE status = 'REJECTED';

-- Step 3c: Reset TimesheetSubmission records with status SUBMITTED or APPROVED to DRAFT
-- Clear all approval/submission related fields
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

-- ============================================================================
-- STEP 4: VERIFICATION - Confirm what was reset
-- ============================================================================
-- Uncomment these queries to verify the reset

-- Verify no SUBMITTED/APPROVED TimesheetSubmission records remain
-- SELECT COUNT(*) as remaining_submitted_approved 
-- FROM "timesheet_submissions"
-- WHERE status IN ('SUBMITTED', 'APPROVED');
-- Expected: 0

-- Verify no REJECTED TimesheetSubmission records remain
-- SELECT COUNT(*) as remaining_rejected 
-- FROM "timesheet_submissions"
-- WHERE status = 'REJECTED';
-- Expected: 0

-- Verify DRAFT count increased (should include reset submissions)
-- SELECT status, COUNT(*) as count 
-- FROM "timesheet_submissions"
-- GROUP BY status
-- ORDER BY status;

-- Verify REJECTED TimesheetSubmission records are deleted
-- SELECT COUNT(*) as remaining_rejected 
-- FROM "timesheet_submissions"
-- WHERE status = 'REJECTED';
-- Expected: 0

-- Verify TimeEntry records linked to reset submissions are still linked (now to DRAFT)
-- SELECT COUNT(*) as linked_to_draft_submissions 
-- FROM "time_entries" te
-- INNER JOIN "timesheet_submissions" ts ON te."submissionId" = ts.id
-- WHERE ts.status = 'DRAFT';
-- This should include the previously SUBMITTED/APPROVED submissions

-- Verify TimeEntry records linked to REJECTED submissions are deleted
-- SELECT COUNT(*) as remaining_linked_to_rejected 
-- FROM "time_entries" te
-- INNER JOIN "timesheet_submissions" ts ON te."submissionId" = ts.id
-- WHERE ts.status = 'REJECTED';
-- Expected: 0

-- Verify TimeEntry records without submissions are preserved
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

-- Verify that approval/submission fields are cleared for reset submissions
-- SELECT id, status, "submittedAt", "approvedAt", "approvedById", "rejectedAt", "rejectedById", "rejectionReason"
-- FROM "timesheet_submissions"
-- WHERE status = 'DRAFT'
--   AND ("submittedAt" IS NOT NULL 
--        OR "approvedAt" IS NOT NULL 
--        OR "approvedById" IS NOT NULL
--        OR "rejectedAt" IS NOT NULL
--        OR "rejectedById" IS NOT NULL
--        OR "rejectionReason" IS NOT NULL)
-- LIMIT 10;
-- Expected: 0 rows (all fields should be NULL for reset submissions)

-- Summary verification query
-- SELECT 
--   (SELECT COUNT(*) FROM "timesheet_submissions" WHERE status IN ('SUBMITTED', 'APPROVED')) as remaining_submitted_approved,
--   (SELECT COUNT(*) FROM "timesheet_submissions" WHERE status = 'DRAFT') as draft_count,
--   (SELECT COUNT(*) FROM "timesheet_submissions" WHERE status = 'REJECTED') as remaining_rejected,
--   (SELECT COUNT(*) FROM "time_entries" te INNER JOIN "timesheet_submissions" ts ON te."submissionId" = ts.id WHERE ts.status = 'REJECTED') as linked_to_rejected_timeentries,
--   (SELECT COUNT(*) FROM "time_entries" WHERE "submissionId" IS NOT NULL) as linked_timeentries,
--   (SELECT COUNT(*) FROM "time_entries" WHERE "submissionId" IS NULL) as unlinked_timeentries,
--   (SELECT COUNT(*) FROM "timesheets") as timesheet_count,
--   (SELECT COUNT(*) FROM "users") as user_count,
--   (SELECT COUNT(*) FROM "jobs") as job_count;

-- ============================================================================
-- NOTES:
-- ============================================================================
-- - This script resets SUBMITTED/APPROVED timesheet submission status to DRAFT
-- - This script DELETES REJECTED timesheet submissions and their linked TimeEntries
-- - DRAFT submissions are preserved as-is
-- - TimeEntry records linked to SUBMITTED/APPROVED remain linked (now to DRAFT submissions)
-- - TimeEntry records linked to REJECTED are DELETED
-- - TimeEntry records without submissionId are preserved
-- - Base timesheet/attendance records (Timesheet model) are NOT affected
-- - All other data (Users, Jobs, LaborCodes, etc.) is preserved
-- - Run verification queries before and after to confirm expected behavior
-- - Consider creating a backup before running the reset (see STEP 2)
-- ============================================================================

