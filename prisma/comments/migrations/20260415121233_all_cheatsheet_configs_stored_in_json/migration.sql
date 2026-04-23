/*
  Warnings:

  - You are about to drop the column `canStudentUploadCheatsheet` on the `courseMetadata` table. All the data in the column will be lost.
  - You are about to drop the column `hasCheatsheet` on the `courseMetadata` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `courseMetadata` DROP COLUMN `canStudentUploadCheatsheet`,
    DROP COLUMN `hasCheatsheet`,
    ADD COLUMN `cheatsheetConfig` JSON NULL;
