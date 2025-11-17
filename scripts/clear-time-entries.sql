-- Clear all timekeeping-related data
-- This will delete all timesheets, job entries, time entries, and submissions

-- Delete in order to respect foreign key constraints
DELETE FROM "JobEntry";
DELETE FROM "TimeEntry";
DELETE FROM "TimesheetSubmission";
DELETE FROM "Timesheet";

-- Reset sequences if needed (PostgreSQL)
-- ALTER SEQUENCE "Timesheet_id_seq" RESTART WITH 1;
-- ALTER SEQUENCE "JobEntry_id_seq" RESTART WITH 1;
-- ALTER SEQUENCE "TimeEntry_id_seq" RESTART WITH 1;
-- ALTER SEQUENCE "TimesheetSubmission_id_seq" RESTART WITH 1;

