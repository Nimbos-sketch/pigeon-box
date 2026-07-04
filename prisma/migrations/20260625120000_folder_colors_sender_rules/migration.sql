-- AlterTable
ALTER TABLE "EmailFolder" ADD COLUMN "color" TEXT NOT NULL DEFAULT '#f59e0b';

-- CreateTable
CREATE TABLE "SenderRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "senderKey" TEXT NOT NULL,
    "preferredAction" TEXT NOT NULL,
    "folderId" TEXT,
    "actionCount" INTEGER NOT NULL DEFAULT 1,
    "autoApply" BOOLEAN NOT NULL DEFAULT false,
    "lastActionAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SenderRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SenderRule_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "EmailFolder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SenderRule_userId_senderKey_key" ON "SenderRule"("userId", "senderKey");
CREATE INDEX "SenderRule_userId_autoApply_idx" ON "SenderRule"("userId", "autoApply");
