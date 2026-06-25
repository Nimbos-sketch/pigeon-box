-- CreateTable
CREATE TABLE "EmailFolder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gmailLabelId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmailFolder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "EmailFolder_userId_idx" ON "EmailFolder"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailFolder_userId_name_key" ON "EmailFolder"("userId", "name");
