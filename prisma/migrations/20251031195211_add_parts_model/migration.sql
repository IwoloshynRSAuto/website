-- CreateTable
CREATE TABLE "parts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partNumber" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "description" TEXT,
    "primarySource" TEXT,
    "secondarySources" TEXT,
    "purchasePrice" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "part_relations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partAId" TEXT NOT NULL,
    "partBId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "part_relations_partAId_fkey" FOREIGN KEY ("partAId") REFERENCES "parts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "part_relations_partBId_fkey" FOREIGN KEY ("partBId") REFERENCES "parts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "parts_partNumber_key" ON "parts"("partNumber");

-- CreateIndex
CREATE UNIQUE INDEX "part_relations_partAId_partBId_key" ON "part_relations"("partAId", "partBId");
