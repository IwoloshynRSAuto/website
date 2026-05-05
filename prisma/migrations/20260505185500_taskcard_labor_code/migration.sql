-- Add laborCodeId mapping for task_cards (deliverable -> phase code)
ALTER TABLE "task_cards" ADD COLUMN IF NOT EXISTS "laborCodeId" TEXT;

DO $$
BEGIN
  ALTER TABLE "task_cards"
    ADD CONSTRAINT "task_cards_laborCodeId_fkey"
    FOREIGN KEY ("laborCodeId") REFERENCES "labor_codes"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

CREATE INDEX IF NOT EXISTS "task_cards_laborCodeId_idx" ON "task_cards"("laborCodeId");

