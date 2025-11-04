-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_boms" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_boms" ("createdAt", "id", "name", "updatedAt") SELECT "createdAt", "id", "name", "updatedAt" FROM "boms";
DROP TABLE "boms";
ALTER TABLE "new_boms" RENAME TO "boms";
CREATE TABLE "new_quotes" (
    "bomId" TEXT,
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "customerId" TEXT NOT NULL,
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
    CONSTRAINT "quotes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_quotes" ("amount", "createdAt", "customerContactEmail", "customerContactName", "customerContactPhone", "customerId", "description", "estimatedHours", "hourlyRate", "id", "isActive", "laborCost", "lastFollowUp", "materialCost", "overheadCost", "paymentTerms", "profitMargin", "quoteFile", "quoteNumber", "status", "title", "updatedAt", "validUntil") SELECT "amount", "createdAt", "customerContactEmail", "customerContactName", "customerContactPhone", "customerId", "description", "estimatedHours", "hourlyRate", "id", "isActive", "laborCost", "lastFollowUp", "materialCost", "overheadCost", "paymentTerms", "profitMargin", "quoteFile", "quoteNumber", "status", "title", "updatedAt", "validUntil" FROM "quotes";
DROP TABLE "quotes";
ALTER TABLE "new_quotes" RENAME TO "quotes";
CREATE UNIQUE INDEX "quotes_quoteNumber_key" ON "quotes"("quoteNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
