/*
  Warnings:

  - You are about to drop the `Embedding` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "Embedding_fileId_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Embedding";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_File" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "mimetype" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "content" BLOB NOT NULL,
    "extractedText" TEXT,
    "type" TEXT NOT NULL DEFAULT 'pdf',
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "File_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_File" ("content", "createdAt", "extractedText", "filename", "id", "mimetype", "size", "userId") SELECT "content", "createdAt", "extractedText", "filename", "id", "mimetype", "size", "userId" FROM "File";
DROP TABLE "File";
ALTER TABLE "new_File" RENAME TO "File";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
