-- Manual Migration: Add Employee Hierarchy and Audit Logs
-- Run this SQL directly in your PostgreSQL database if Prisma migrations are having issues

-- Step 1: Add managerId to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS "managerId" TEXT;

-- Step 2: Add foreign key constraint for managerId
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_managerId_fkey'
    ) THEN
        ALTER TABLE users 
        ADD CONSTRAINT "users_managerId_fkey" 
        FOREIGN KEY ("managerId") 
        REFERENCES users(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- Step 3: Create audit_logs table
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- Step 4: Create indexes for audit_logs
CREATE INDEX IF NOT EXISTS "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX IF NOT EXISTS "audit_logs_resourceType_idx" ON "audit_logs"("resourceType");
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX IF NOT EXISTS "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- Step 5: Add foreign key for audit_logs.userId
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'audit_logs_userId_fkey'
    ) THEN
        ALTER TABLE "audit_logs" 
        ADD CONSTRAINT "audit_logs_userId_fkey" 
        FOREIGN KEY ("userId") 
        REFERENCES "users"("id") 
        ON DELETE CASCADE;
    END IF;
END $$;

-- Step 6: Create quote_lost_reasons table
CREATE TABLE IF NOT EXISTS "quote_lost_reasons" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_lost_reasons_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "quote_lost_reasons_quoteId_key" UNIQUE ("quoteId")
);

-- Step 7: Create index for quote_lost_reasons
CREATE INDEX IF NOT EXISTS "quote_lost_reasons_reason_idx" ON "quote_lost_reasons"("reason");

-- Step 8: Add foreign key for quote_lost_reasons.quoteId
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'quote_lost_reasons_quoteId_fkey'
    ) THEN
        ALTER TABLE "quote_lost_reasons" 
        ADD CONSTRAINT "quote_lost_reasons_quoteId_fkey" 
        FOREIGN KEY ("quoteId") 
        REFERENCES "quotes"("id") 
        ON DELETE CASCADE;
    END IF;
END $$;

-- Step 9: Add certificateFileId to equipment_calibrations (for the FileRecord relation fix)
ALTER TABLE "equipment_calibrations" ADD COLUMN IF NOT EXISTS "certificateFileId" TEXT;

-- Step 10: Add unique constraint for certificateFileId
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'equipment_calibrations_certificateFileId_key'
    ) THEN
        ALTER TABLE "equipment_calibrations" 
        ADD CONSTRAINT "equipment_calibrations_certificateFileId_key" 
        UNIQUE ("certificateFileId");
    END IF;
END $$;

-- Step 11: Add foreign key for certificateFileId
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'equipment_calibrations_certificateFileId_fkey'
    ) THEN
        ALTER TABLE "equipment_calibrations" 
        ADD CONSTRAINT "equipment_calibrations_certificateFileId_fkey" 
        FOREIGN KEY ("certificateFileId") 
        REFERENCES "file_records"("id") 
        ON DELETE SET NULL;
    END IF;
END $$;

-- Verify the changes
SELECT 'Migration completed successfully!' as status;

