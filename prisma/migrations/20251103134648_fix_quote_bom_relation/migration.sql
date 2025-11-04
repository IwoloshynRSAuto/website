/*
  Warnings:

  - You are about to drop the column `bomId` on the `quotes` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_boms" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "tags" TEXT,
    "linkedQuoteId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "boms_linkedQuoteId_fkey" FOREIGN KEY ("linkedQuoteId") REFERENCES "quotes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_boms" ("createdAt", "id", "name", "notes", "status", "updatedAt") SELECT "createdAt", "id", "name", "notes", "status", "updatedAt" FROM "boms";
DROP TABLE "boms";
ALTER TABLE "new_boms" RENAME TO "boms";
CREATE TABLE "new_packages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Package',
    "description" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_packages" ("createdAt", "description", "id", "name", "notes", "updatedAt") SELECT "createdAt", "description", "id", "name", "notes", "updatedAt" FROM "packages";
DROP TABLE "packages";
ALTER TABLE "new_packages" RENAME TO "packages";
CREATE TABLE "new_quotes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "customerId" TEXT,
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
    CONSTRAINT "quotes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_quotes" ("amount", "createdAt", "customerContactEmail", "customerContactName", "customerContactPhone", "customerId", "description", "estimatedHours", "hourlyRate", "id", "isActive", "laborCost", "lastFollowUp", "materialCost", "overheadCost", "paymentTerms", "profitMargin", "quoteFile", "quoteNumber", "status", "title", "updatedAt", "validUntil") SELECT "amount", "createdAt", "customerContactEmail", "customerContactName", "customerContactPhone", "customerId", "description", "estimatedHours", "hourlyRate", "id", "isActive", "laborCost", "lastFollowUp", "materialCost", "overheadCost", "paymentTerms", "profitMargin", "quoteFile", "quoteNumber", "status", "title", "updatedAt", "validUntil" FROM "quotes";
DROP TABLE "quotes";
ALTER TABLE "new_quotes" RENAME TO "quotes";
CREATE UNIQUE INDEX "quotes_quoteNumber_key" ON "quotes"("quoteNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
