-- Drop old unique index if exists (safety check)
-- This ensures no residual index remains from the old constraint
DROP INDEX IF EXISTS "timesheet_submissions_userId_weekStart_key";

-- Add type column if missing (should already exist from previous migration, but safe to check)
ALTER TABLE "timesheet_submissions" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'TIME';

-- Backfill existing records (non-job entries -> ATTENDANCE)
-- Update records that don't have job-related time entries to ATTENDANCE type
UPDATE "timesheet_submissions" ts
SET type = CASE
  WHEN NOT EXISTS (
    SELECT 1 
    FROM "time_entries" te 
    WHERE te."submissionId" = ts."id" 
    AND te."jobId" IS NOT NULL
  ) THEN 'ATTENDANCE'
  ELSE 'TIME'
END
WHERE ts.type IS NULL OR ts.type = '';

-- Drop old unique constraint if it exists (PostgreSQL creates indexes for unique constraints)
ALTER TABLE "timesheet_submissions" DROP CONSTRAINT IF EXISTS "timesheet_submissions_userId_weekStart_key";

-- Create new unique constraint with type (creates underlying index automatically)
-- This allows separate ATTENDANCE and TIME submissions for the same user/week
-- Check if constraint already exists before creating
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'timesheet_submissions_userId_weekStart_type_key'
  ) THEN
    ALTER TABLE "timesheet_submissions" 
    ADD CONSTRAINT "timesheet_submissions_userId_weekStart_type_key"
    UNIQUE ("userId", "weekStart", "type");
  END IF;
END $$;

-- Create index for efficient queries by userId and weekStart (without type)
CREATE INDEX IF NOT EXISTS "timesheet_submissions_userId_weekStart_idx" 
ON "timesheet_submissions" ("userId", "weekStart");

