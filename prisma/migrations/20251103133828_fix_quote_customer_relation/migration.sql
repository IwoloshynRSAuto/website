-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_quotes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "customerId" TEXT,
    "bomId" TEXT,
    "amount" REAL NOT NULL DEFAULT 0,
    "validUntil" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "paymentTerms" TEXT,
    "estimatedHours" REAL,
    "hourlyRate" REAL,
    "laborCost" REAL,
    "materialCost" REAL,
    "overheadCost" REAL,
    "profitMargin" REAL,
    "customerContactName" TEXT,
    "customerContactEmail" TEXT,
    "customerContactPhone" TEXT,
    "lastFollowUp" DATETIME,
    "quoteFile" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "quotes_bomId_fkey" FOREIGN KEY ("bomId") REFERENCES "boms" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "quotes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_quotes" ("amount", "bomId", "createdAt", "customerContactEmail", "customerContactName", "customerContactPhone", "customerId", "description", "estimatedHours", "hourlyRate", "id", "isActive", "laborCost", "lastFollowUp", "materialCost", "overheadCost", "paymentTerms", "profitMargin", "quoteFile", "quoteNumber", "status", "title", "updatedAt", "validUntil") SELECT "amount", "bomId", "createdAt", "customerContactEmail", "customerContactName", "customerContactPhone", "customerId", "description", "estimatedHours", "hourlyRate", "id", "isActive", "laborCost", "lastFollowUp", "materialCost", "overheadCost", "paymentTerms", "profitMargin", "quoteFile", "quoteNumber", "status", "title", "updatedAt", "validUntil" FROM "quotes";
DROP TABLE "quotes";
ALTER TABLE "new_quotes" RENAME TO "quotes";
CREATE UNIQUE INDEX "quotes_quoteNumber_key" ON "quotes"("quoteNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
