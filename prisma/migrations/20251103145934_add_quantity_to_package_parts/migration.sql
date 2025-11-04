-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_package_parts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "package_parts_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "package_parts_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_package_parts" ("createdAt", "id", "packageId", "partId", "updatedAt") SELECT "createdAt", "id", "packageId", "partId", "updatedAt" FROM "package_parts";
DROP TABLE "package_parts";
ALTER TABLE "new_package_parts" RENAME TO "package_parts";
CREATE UNIQUE INDEX "package_parts_packageId_partId_key" ON "package_parts"("packageId", "partId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
