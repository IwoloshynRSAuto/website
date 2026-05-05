-- Replace datetime-only assignments/tasks with hour budgets + commitments

DROP TABLE IF EXISTS "tasks" CASCADE;

DROP TABLE IF EXISTS "assignments" CASCADE;

CREATE TABLE "job_schedule_budgets" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "budgetHours" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_schedule_budgets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "job_schedule_budgets_jobId_key" ON "job_schedule_budgets"("jobId");

ALTER TABLE "job_schedule_budgets" ADD CONSTRAINT "job_schedule_budgets_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "job_schedule_commitments" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "plannedHours" DOUBLE PRECISION NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_schedule_commitments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "job_schedule_commitments_budgetId_idx" ON "job_schedule_commitments"("budgetId");

CREATE INDEX "job_schedule_commitments_employeeId_windowStart_idx" ON "job_schedule_commitments"("employeeId", "windowStart");

ALTER TABLE "job_schedule_commitments" ADD CONSTRAINT "job_schedule_commitments_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "job_schedule_budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "job_schedule_commitments" ADD CONSTRAINT "job_schedule_commitments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
