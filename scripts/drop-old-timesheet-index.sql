-- scripts/drop-old-timesheet-index.sql
-- Drop old unique index if exists (safety check)
DROP INDEX IF EXISTS "timesheet_submissions_userId_weekStart_key";
-- Also drop any similarly named legacy index
DROP INDEX IF EXISTS "timesheet_submissions_userid_weekstart_idx";

