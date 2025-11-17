-- CreateTable
CREATE TABLE "quote_revisions" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quote_revisions_quoteId_idx" ON "quote_revisions"("quoteId");

-- CreateIndex
CREATE INDEX "quote_revisions_createdById_idx" ON "quote_revisions"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "quote_revisions_quoteId_revisionNumber_key" ON "quote_revisions"("quoteId", "revisionNumber");

-- AddForeignKey
ALTER TABLE "quote_revisions" ADD CONSTRAINT "quote_revisions_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_revisions" ADD CONSTRAINT "quote_revisions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

