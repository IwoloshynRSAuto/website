-- CreateTable
CREATE TABLE "packages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "package_parts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "package_parts_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "package_parts_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "package_parts_packageId_partId_key" ON "package_parts"("packageId", "partId");
