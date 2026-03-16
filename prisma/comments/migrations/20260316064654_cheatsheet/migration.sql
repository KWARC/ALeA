-- CreateTable
CREATE TABLE `CheatSheet` (
    `cheatsheetId` VARCHAR(50) NOT NULL,
    `userId` VARCHAR(255) NOT NULL,
    `studentName` VARCHAR(255) NULL,
    `universityId` VARCHAR(255) NOT NULL,
    `courseId` VARCHAR(255) NOT NULL,
    `instanceId` VARCHAR(255) NOT NULL,
    `weekId` VARCHAR(255) NOT NULL,
    `checksum` VARCHAR(255) NULL,
    `fileName` VARCHAR(255) NULL,
    `uploadedVersionNumber` INTEGER NULL,
    `uploadedByUserId` VARCHAR(255) NULL,
    `uploadedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL,
    `updatedAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`cheatsheetId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CheatSheetHistory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cheatsheetId` VARCHAR(50) NOT NULL,
    `uploadedVersionNumber` INTEGER NOT NULL,
    `uploadedByUserId` VARCHAR(255) NOT NULL,
    `checksum` VARCHAR(255) NULL,
    `fileName` VARCHAR(255) NULL,
    `uploadedAt` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL,
    `updatedAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CheatSheetHistory` ADD CONSTRAINT `CheatSheetHistory_ibfk_1` FOREIGN KEY (`cheatsheetId`) REFERENCES `CheatSheet`(`cheatsheetId`) ON DELETE CASCADE ON UPDATE CASCADE;
