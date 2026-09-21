-- Nullable unique Cdi id on userInfo (unused until Cdi tokens).
-- Staging table for Cdi logins that do not yet have a userInfo row.

ALTER TABLE `userInfo` ADD COLUMN `cdiId` VARCHAR(255) NULL;

CREATE UNIQUE INDEX `userInfo_cdiId_key` ON `userInfo`(`cdiId`);

CREATE TABLE `unverifiedUsers` (
  `cdiId` VARCHAR(255) NOT NULL,
  `emailAddress` VARCHAR(255) NULL,
  `verificationToken` VARCHAR(255) NULL,
  PRIMARY KEY (`cdiId`),
  UNIQUE KEY `unverifiedUsers_emailAddress_key` (`emailAddress`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
