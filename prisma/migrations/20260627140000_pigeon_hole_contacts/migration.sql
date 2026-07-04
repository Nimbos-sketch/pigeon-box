-- Redefine PigeonHole for contacts and manual team slots
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_PigeonHole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "userId" TEXT,
    "ownerUserId" TEXT,
    "contactEmail" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'member',
    "slotCode" TEXT NOT NULL,
    "label" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PigeonHole_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PigeonHole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_PigeonHole" ("id", "orgId", "userId", "ownerUserId", "contactEmail", "kind", "slotCode", "label", "createdAt", "updatedAt")
SELECT "id", "orgId", "userId", "userId", NULL, 'member', "slotCode", "label", "createdAt", "updatedAt"
FROM "PigeonHole";

DROP TABLE "PigeonHole";
ALTER TABLE "new_PigeonHole" RENAME TO "PigeonHole";

CREATE UNIQUE INDEX "PigeonHole_orgId_userId_key" ON "PigeonHole"("orgId", "userId");
CREATE UNIQUE INDEX "PigeonHole_orgId_ownerUserId_contactEmail_key" ON "PigeonHole"("orgId", "ownerUserId", "contactEmail");
CREATE UNIQUE INDEX "PigeonHole_orgId_ownerUserId_slotCode_key" ON "PigeonHole"("orgId", "ownerUserId", "slotCode");
CREATE INDEX "PigeonHole_orgId_idx" ON "PigeonHole"("orgId");
CREATE INDEX "PigeonHole_userId_idx" ON "PigeonHole"("userId");
CREATE INDEX "PigeonHole_ownerUserId_idx" ON "PigeonHole"("ownerUserId");
CREATE INDEX "PigeonHole_contactEmail_idx" ON "PigeonHole"("contactEmail");

PRAGMA foreign_keys=ON;
