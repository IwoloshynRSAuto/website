-- Add estimatedHours to task_cards for quote/job task deliverables rollups
ALTER TABLE "task_cards" ADD COLUMN IF NOT EXISTS "estimatedHours" DOUBLE PRECISION DEFAULT 0;

