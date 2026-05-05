-- AlterTable
ALTER TABLE "dev_time_entries" ADD COLUMN "punchCountsAsOvertime" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "dev_time_entries" ADD COLUMN "manualOvertimeHours" DECIMAL(10,2) NOT NULL DEFAULT 0;
