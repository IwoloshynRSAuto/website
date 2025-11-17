-- CreateTable
CREATE TABLE "job_milestones" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "milestoneType" TEXT NOT NULL,
    "scheduledStartDate" TIMESTAMP(3),
    "scheduledEndDate" TIMESTAMP(3),
    "actualStartDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "billingPercentage" REAL,
    "isBillingTrigger" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_milestones_jobId_idx" ON "job_milestones"("jobId");

-- CreateIndex
CREATE INDEX "job_milestones_status_idx" ON "job_milestones"("status");

-- CreateIndex
CREATE INDEX "job_milestones_milestoneType_idx" ON "job_milestones"("milestoneType");

-- AddForeignKey
ALTER TABLE "job_milestones" ADD CONSTRAINT "job_milestones_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

