-- Drop legacy scheduling (budget + commitments)
DROP TABLE IF EXISTS "job_schedule_commitments";
DROP TABLE IF EXISTS "job_schedule_budgets";

-- Labor-first schedule: time segments per quoted labor line
CREATE TABLE "job_labor_schedule_segments" (
    "id" TEXT NOT NULL,
    "jobLaborEstimateId" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_labor_schedule_segments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "job_labor_schedule_segments_jobLaborEstimateId_idx" ON "job_labor_schedule_segments"("jobLaborEstimateId");
CREATE INDEX "job_labor_schedule_segments_windowStart_idx" ON "job_labor_schedule_segments"("windowStart");

ALTER TABLE "job_labor_schedule_segments" ADD CONSTRAINT "job_labor_schedule_segments_jobLaborEstimateId_fkey" FOREIGN KEY ("jobLaborEstimateId") REFERENCES "job_labor_estimates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "job_labor_schedule_assignments" (
    "id" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_labor_schedule_assignments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "job_labor_schedule_assignments_segmentId_idx" ON "job_labor_schedule_assignments"("segmentId");
CREATE INDEX "job_labor_schedule_assignments_employeeId_idx" ON "job_labor_schedule_assignments"("employeeId");

ALTER TABLE "job_labor_schedule_assignments" ADD CONSTRAINT "job_labor_schedule_assignments_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "job_labor_schedule_segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "job_labor_schedule_assignments" ADD CONSTRAINT "job_labor_schedule_assignments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
