-- OT phase flags on labor codes
ALTER TABLE "labor_codes" ADD COLUMN IF NOT EXISTS "isOvertimePhase" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "labor_codes" ADD COLUMN IF NOT EXISTS "overtimeRateMultiplier" DECIMAL(5,2) NOT NULL DEFAULT 1.5;

-- Shop machine rows (optional phase code as placeholder / label)
CREATE TABLE IF NOT EXISTS "shop_machines" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phaseCodeId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "shop_machines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "machine_shop_assignments" (
    "id" TEXT NOT NULL,
    "shopMachineId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" TEXT,
    "plannedStart" TIMESTAMP(3) NOT NULL,
    "plannedEnd" TIMESTAMP(3) NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "machine_shop_assignments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "shop_machines_phaseCodeId_idx" ON "shop_machines"("phaseCodeId");
CREATE INDEX IF NOT EXISTS "shop_machines_isActive_sortOrder_idx" ON "shop_machines"("isActive", "sortOrder");
CREATE INDEX IF NOT EXISTS "machine_shop_assignments_shopMachineId_plannedStart_idx" ON "machine_shop_assignments"("shopMachineId", "plannedStart");
CREATE INDEX IF NOT EXISTS "machine_shop_assignments_jobId_idx" ON "machine_shop_assignments"("jobId");
CREATE INDEX IF NOT EXISTS "machine_shop_assignments_userId_idx" ON "machine_shop_assignments"("userId");

DO $$
BEGIN
  ALTER TABLE "shop_machines" ADD CONSTRAINT "shop_machines_phaseCodeId_fkey" FOREIGN KEY ("phaseCodeId") REFERENCES "labor_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "machine_shop_assignments" ADD CONSTRAINT "machine_shop_assignments_shopMachineId_fkey" FOREIGN KEY ("shopMachineId") REFERENCES "shop_machines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "machine_shop_assignments" ADD CONSTRAINT "machine_shop_assignments_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "machine_shop_assignments" ADD CONSTRAINT "machine_shop_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
