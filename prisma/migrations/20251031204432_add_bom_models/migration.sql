-- CreateTable
CREATE TABLE "boms" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "bom_parts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bomId" TEXT NOT NULL,
    "partId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "purchasePrice" REAL NOT NULL,
    "markupPercent" REAL NOT NULL DEFAULT 20.0,
    "customerPrice" REAL NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "description" TEXT,
    "source" TEXT,
    "notes" TEXT,
    "estimatedDelivery" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'HOLD',
    "partNumber" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "bom_parts_bomId_fkey" FOREIGN KEY ("bomId") REFERENCES "boms" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "bom_parts_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
