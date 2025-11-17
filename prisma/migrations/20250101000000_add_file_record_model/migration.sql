-- CreateTable
CREATE TABLE "file_records" (
    "id" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileUrl" TEXT,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER,
    "metadata" JSONB,
    "createdById" TEXT NOT NULL,
    "linkedJobId" TEXT,
    "linkedQuoteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "file_records_linkedJobId_idx" ON "file_records"("linkedJobId");

-- CreateIndex
CREATE INDEX "file_records_linkedQuoteId_idx" ON "file_records"("linkedQuoteId");

-- CreateIndex
CREATE INDEX "file_records_createdById_idx" ON "file_records"("createdById");

-- CreateIndex
CREATE INDEX "file_records_fileType_idx" ON "file_records"("fileType");

-- AddForeignKey
ALTER TABLE "file_records" ADD CONSTRAINT "file_records_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_records" ADD CONSTRAINT "file_records_linkedJobId_fkey" FOREIGN KEY ("linkedJobId") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_records" ADD CONSTRAINT "file_records_linkedQuoteId_fkey" FOREIGN KEY ("linkedQuoteId") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

