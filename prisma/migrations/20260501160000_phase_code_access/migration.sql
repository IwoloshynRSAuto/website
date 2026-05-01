-- Add job role assignment to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "jobRoleId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "job_roles" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "job_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "job_roles_name_key" ON "job_roles"("name");

-- CreateTable
CREATE TABLE IF NOT EXISTS "job_role_phase_codes" (
  "jobRoleId" TEXT NOT NULL,
  "laborCodeId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "job_role_phase_codes_pkey" PRIMARY KEY ("jobRoleId","laborCodeId")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "job_role_phase_codes_laborCodeId_idx" ON "job_role_phase_codes"("laborCodeId");

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_phase_code_overrides" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "laborCodeId" TEXT NOT NULL,
  "mode" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_phase_code_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "user_phase_code_overrides_userId_laborCodeId_key" ON "user_phase_code_overrides"("userId","laborCodeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_phase_code_overrides_laborCodeId_idx" ON "user_phase_code_overrides"("laborCodeId");

-- AddForeignKey
ALTER TABLE "users"
  ADD CONSTRAINT "users_jobRoleId_fkey"
  FOREIGN KEY ("jobRoleId") REFERENCES "job_roles"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_role_phase_codes"
  ADD CONSTRAINT "job_role_phase_codes_jobRoleId_fkey"
  FOREIGN KEY ("jobRoleId") REFERENCES "job_roles"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_role_phase_codes"
  ADD CONSTRAINT "job_role_phase_codes_laborCodeId_fkey"
  FOREIGN KEY ("laborCodeId") REFERENCES "labor_codes"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_phase_code_overrides"
  ADD CONSTRAINT "user_phase_code_overrides_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_phase_code_overrides"
  ADD CONSTRAINT "user_phase_code_overrides_laborCodeId_fkey"
  FOREIGN KEY ("laborCodeId") REFERENCES "labor_codes"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

