-- CreateTable
CREATE TABLE "dev_time_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "hoursWorked" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dev_time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dev_time_entries_userId_date_idx" ON "dev_time_entries"("userId", "date");

-- CreateIndex
CREATE INDEX "dev_time_entries_userId_startTime_idx" ON "dev_time_entries"("userId", "startTime");

-- CreateIndex
CREATE INDEX "dev_time_entries_jobId_idx" ON "dev_time_entries"("jobId");

-- AddForeignKey
ALTER TABLE "dev_time_entries" ADD CONSTRAINT "dev_time_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dev_time_entries" ADD CONSTRAINT "dev_time_entries_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

