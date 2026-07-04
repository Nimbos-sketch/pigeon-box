-- CreateTable
CREATE TABLE "PigeonHole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slotCode" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PigeonHole_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PigeonHole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PigeonHoleMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "holeId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderOrgId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unread',
    "obligationQueue" TEXT NOT NULL DEFAULT 'action',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PigeonHoleMessage_holeId_fkey" FOREIGN KEY ("holeId") REFERENCES "PigeonHole" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PigeonHoleMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrgTeamLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromOrgId" TEXT NOT NULL,
    "toOrgId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OrgTeamLink_fromOrgId_fkey" FOREIGN KEY ("fromOrgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrgTeamLink_toOrgId_fkey" FOREIGN KEY ("toOrgId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrgTeamLink_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PigeonHole_orgId_userId_key" ON "PigeonHole"("orgId", "userId");
CREATE UNIQUE INDEX "PigeonHole_orgId_slotCode_key" ON "PigeonHole"("orgId", "slotCode");
CREATE INDEX "PigeonHole_orgId_idx" ON "PigeonHole"("orgId");
CREATE INDEX "PigeonHole_userId_idx" ON "PigeonHole"("userId");
CREATE INDEX "PigeonHoleMessage_holeId_status_createdAt_idx" ON "PigeonHoleMessage"("holeId", "status", "createdAt");
CREATE INDEX "PigeonHoleMessage_senderId_createdAt_idx" ON "PigeonHoleMessage"("senderId", "createdAt");
CREATE UNIQUE INDEX "OrgTeamLink_fromOrgId_toOrgId_key" ON "OrgTeamLink"("fromOrgId", "toOrgId");
CREATE INDEX "OrgTeamLink_toOrgId_status_idx" ON "OrgTeamLink"("toOrgId", "status");
