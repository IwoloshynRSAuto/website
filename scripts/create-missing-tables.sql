-- Create Missing Tables for Employee Dashboard
-- Run this if tables are missing

-- Create time_off_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS "time_off_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "requestType" TEXT NOT NULL,
    "reason" TEXT,
    "hours" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedById" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_off_requests_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "time_off_requests_userId_idx" ON "time_off_requests"("userId");
CREATE INDEX IF NOT EXISTS "time_off_requests_status_idx" ON "time_off_requests"("status");
CREATE INDEX IF NOT EXISTS "time_off_requests_requestType_idx" ON "time_off_requests"("requestType");
CREATE INDEX IF NOT EXISTS "time_off_requests_startDate_idx" ON "time_off_requests"("startDate");

-- Add foreign keys
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'time_off_requests_userId_fkey'
    ) THEN
        ALTER TABLE "time_off_requests" 
        ADD CONSTRAINT "time_off_requests_userId_fkey" 
        FOREIGN KEY ("userId") 
        REFERENCES "users"("id") 
        ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'time_off_requests_approvedById_fkey'
    ) THEN
        ALTER TABLE "time_off_requests" 
        ADD CONSTRAINT "time_off_requests_approvedById_fkey" 
        FOREIGN KEY ("approvedById") 
        REFERENCES "users"("id") 
        ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'time_off_requests_rejectedById_fkey'
    ) THEN
        ALTER TABLE "time_off_requests" 
        ADD CONSTRAINT "time_off_requests_rejectedById_fkey" 
        FOREIGN KEY ("rejectedById") 
        REFERENCES "users"("id") 
        ON DELETE SET NULL;
    END IF;
END $$;

-- Create expense_reports table if it doesn't exist
CREATE TABLE IF NOT EXISTS "expense_reports" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "category" TEXT NOT NULL,
    "jobId" TEXT,
    "receiptFileId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedById" TEXT,
    "rejectionReason" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_reports_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "expense_reports_receiptFileId_key" UNIQUE ("receiptFileId")
);

-- Create indexes for expense_reports
CREATE INDEX IF NOT EXISTS "expense_reports_userId_idx" ON "expense_reports"("userId");
CREATE INDEX IF NOT EXISTS "expense_reports_status_idx" ON "expense_reports"("status");
CREATE INDEX IF NOT EXISTS "expense_reports_category_idx" ON "expense_reports"("category");
CREATE INDEX IF NOT EXISTS "expense_reports_jobId_idx" ON "expense_reports"("jobId");
CREATE INDEX IF NOT EXISTS "expense_reports_reportDate_idx" ON "expense_reports"("reportDate");

-- Add foreign keys for expense_reports
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'expense_reports_userId_fkey'
    ) THEN
        ALTER TABLE "expense_reports" 
        ADD CONSTRAINT "expense_reports_userId_fkey" 
        FOREIGN KEY ("userId") 
        REFERENCES "users"("id") 
        ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'expense_reports_jobId_fkey'
    ) THEN
        ALTER TABLE "expense_reports" 
        ADD CONSTRAINT "expense_reports_jobId_fkey" 
        FOREIGN KEY ("jobId") 
        REFERENCES "jobs"("id") 
        ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'expense_reports_approvedById_fkey'
    ) THEN
        ALTER TABLE "expense_reports" 
        ADD CONSTRAINT "expense_reports_approvedById_fkey" 
        FOREIGN KEY ("approvedById") 
        REFERENCES "users"("id") 
        ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'expense_reports_rejectedById_fkey'
    ) THEN
        ALTER TABLE "expense_reports" 
        ADD CONSTRAINT "expense_reports_rejectedById_fkey" 
        FOREIGN KEY ("rejectedById") 
        REFERENCES "users"("id") 
        ON DELETE SET NULL;
    END IF;
END $$;

-- Create service_reports table if it doesn't exist
CREATE TABLE IF NOT EXISTS "service_reports" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "serviceType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hoursWorked" DOUBLE PRECISION,
    "customerNotes" TEXT,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_reports_pkey" PRIMARY KEY ("id")
);

-- Create indexes for service_reports
CREATE INDEX IF NOT EXISTS "service_reports_jobId_idx" ON "service_reports"("jobId");
CREATE INDEX IF NOT EXISTS "service_reports_userId_idx" ON "service_reports"("userId");
CREATE INDEX IF NOT EXISTS "service_reports_reportDate_idx" ON "service_reports"("reportDate");
CREATE INDEX IF NOT EXISTS "service_reports_serviceType_idx" ON "service_reports"("serviceType");

-- Add foreign keys for service_reports
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'service_reports_jobId_fkey'
    ) THEN
        ALTER TABLE "service_reports" 
        ADD CONSTRAINT "service_reports_jobId_fkey" 
        FOREIGN KEY ("jobId") 
        REFERENCES "jobs"("id") 
        ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'service_reports_userId_fkey'
    ) THEN
        ALTER TABLE "service_reports" 
        ADD CONSTRAINT "service_reports_userId_fkey" 
        FOREIGN KEY ("userId") 
        REFERENCES "users"("id") 
        ON DELETE CASCADE;
    END IF;
END $$;

SELECT 'Missing tables created successfully!' as status;

