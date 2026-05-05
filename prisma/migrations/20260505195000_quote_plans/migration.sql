-- Quote plans + items (template-driven deliverables lists)
CREATE TABLE IF NOT EXISTS "quote_plans" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "isDefault" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "quote_plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "quote_plans_name_key" ON "quote_plans"("name");

CREATE TABLE IF NOT EXISTS "quote_plan_items" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "taskCode" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "laborCodeId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "quote_plan_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "quote_plan_items_planId_taskCode_key" ON "quote_plan_items"("planId","taskCode");
CREATE INDEX IF NOT EXISTS "quote_plan_items_planId_idx" ON "quote_plan_items"("planId");
CREATE INDEX IF NOT EXISTS "quote_plan_items_laborCodeId_idx" ON "quote_plan_items"("laborCodeId");

DO $$
BEGIN
  ALTER TABLE "quote_plan_items"
    ADD CONSTRAINT "quote_plan_items_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "quote_plans"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "quote_plan_items"
    ADD CONSTRAINT "quote_plan_items_laborCodeId_fkey"
    FOREIGN KEY ("laborCodeId") REFERENCES "labor_codes"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "planId" TEXT;
CREATE INDEX IF NOT EXISTS "quotes_planId_idx" ON "quotes"("planId");

DO $$
BEGIN
  ALTER TABLE "quotes"
    ADD CONSTRAINT "quotes_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "quote_plans"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

