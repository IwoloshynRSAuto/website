-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "decimalValue" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- Seed OT multiplier (single global setting)
INSERT INTO "system_settings" ("id", "key", "decimalValue", "createdAt", "updatedAt")
VALUES ('sys_seed_ot_multiplier', 'OT_MULTIPLIER', 1.5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable
ALTER TABLE "time_entries" ADD COLUMN "regularRateUsed" DECIMAL(65,30),
ADD COLUMN "otRateUsed" DECIMAL(65,30),
ADD COLUMN "otMultiplierUsed" DECIMAL(65,30),
ADD COLUMN "regularCost" DECIMAL(65,30),
ADD COLUMN "otCost" DECIMAL(65,30),
ADD COLUMN "totalCost" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "job_entries" ADD COLUMN "punchCountsAsOvertime" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "manualOvertimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Backfill snapshot costs for existing time entries (historical correction: OT uses multiplier on OT hours only)
UPDATE "time_entries" AS te
SET
  "regularRateUsed" = x.base,
  "otRateUsed" = x.base,
  "otMultiplierUsed" = x.mult,
  "regularCost" = x.base * te."regularHours",
  "otCost" = x.base * te."overtimeHours" * x.mult,
  "totalCost" = x.base * te."regularHours" + x.base * te."overtimeHours" * x.mult
FROM (
  SELECT
    te2.id,
    COALESCE(
      CASE WHEN te2."laborCodeId" IS NOT NULL THEN lc."hourlyRate" ELSE NULL END,
      te2."rate",
      lc."hourlyRate",
      0
    )::decimal(65,30) AS base,
    COALESCE(
      (SELECT s."decimalValue" FROM "system_settings" s WHERE s."key" = 'OT_MULTIPLIER' LIMIT 1),
      1.5::decimal(65,30)
    )::decimal(65,30) AS mult
  FROM "time_entries" te2
  LEFT JOIN "labor_codes" lc ON lc.id = te2."laborCodeId"
) AS x
WHERE te.id = x.id;
