/*
  Warnings:

  - Added the required column `medications` to the `Prescription` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Prescription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "doctorId" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "patientEmail" TEXT NOT NULL,
    "medications" TEXT NOT NULL,
    "notes" TEXT,
    "qrPayload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Prescription_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Prescription" ("createdAt", "doctorId", "expiresAt", "id", "notes", "patientEmail", "patientName", "qrPayload", "status", "updatedAt") SELECT "createdAt", "doctorId", "expiresAt", "id", "notes", "patientEmail", "patientName", "qrPayload", "status", "updatedAt" FROM "Prescription";
DROP TABLE "Prescription";
ALTER TABLE "new_Prescription" RENAME TO "Prescription";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
