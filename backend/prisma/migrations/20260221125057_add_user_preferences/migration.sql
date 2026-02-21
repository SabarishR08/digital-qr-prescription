-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "auditRefreshEnabled" BOOLEAN NOT NULL DEFAULT true,
    "auditRefreshInterval" INTEGER NOT NULL DEFAULT 15000,
    "scanRefreshEnabled" BOOLEAN NOT NULL DEFAULT true,
    "scanRefreshInterval" INTEGER NOT NULL DEFAULT 15000,
    "scanPinnedVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");
