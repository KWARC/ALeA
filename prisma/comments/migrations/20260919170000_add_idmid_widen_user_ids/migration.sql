-- Widen person-id columns to VARCHAR(255) so they can hold emails.
-- Add nullable unique idmId; unique email (NULLs allowed).
-- Backfill idmId for IdM-shaped, fake, and non-email accounts without using email as userId.

ALTER TABLE `jobApplication` DROP FOREIGN KEY `fk_applicant`;
ALTER TABLE `jobPost` DROP FOREIGN KEY `jobPost_ibfk_3`;
ALTER TABLE `recruiterProfile` DROP FOREIGN KEY `fk_recruiter`;
ALTER TABLE `studentProfile` DROP FOREIGN KEY `fk_user`;

ALTER TABLE `userInfo` MODIFY `userId` VARCHAR(255) NOT NULL;
ALTER TABLE `studentProfile` MODIFY `userId` VARCHAR(255) NOT NULL;
ALTER TABLE `recruiterProfile` MODIFY `userId` VARCHAR(255) NOT NULL;
ALTER TABLE `jobApplication` MODIFY `applicantId` VARCHAR(255) NOT NULL;
ALTER TABLE `jobApplicationAction` MODIFY `userId` VARCHAR(255) NOT NULL;
ALTER TABLE `jobPost` MODIFY `createdByUserId` VARCHAR(255) NULL;
ALTER TABLE `orgInvitations` MODIFY `inviteruserId` VARCHAR(255) NOT NULL;
ALTER TABLE `CourseMaterials` MODIFY `uploadedBy` VARCHAR(255) NOT NULL;
ALTER TABLE `BlogPosts` MODIFY `authorId` VARCHAR(255) NOT NULL;

ALTER TABLE `userInfo` ADD COLUMN `idmId` VARCHAR(255) NULL;

UPDATE `userInfo`
SET `idmId` = `userId`
WHERE `idmId` IS NULL
  AND `userId` NOT LIKE '%@%'
  AND (
    CHAR_LENGTH(TRIM(`userId`)) = 8
    OR LEFT(`userId`, 4) = 'fake'
    OR `saltedPassword` IS NULL
  );

CREATE UNIQUE INDEX `userInfo_idmId_key` ON `userInfo`(`idmId`);
CREATE UNIQUE INDEX `userInfo_email_key` ON `userInfo`(`email`);

ALTER TABLE `studentProfile` ADD CONSTRAINT `fk_user` FOREIGN KEY (`userId`) REFERENCES `userInfo`(`userId`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `recruiterProfile` ADD CONSTRAINT `fk_recruiter` FOREIGN KEY (`userId`) REFERENCES `userInfo`(`userId`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `jobPost` ADD CONSTRAINT `jobPost_ibfk_3` FOREIGN KEY (`createdByUserId`) REFERENCES `userInfo`(`userId`) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE `jobApplication` ADD CONSTRAINT `fk_applicant` FOREIGN KEY (`applicantId`) REFERENCES `studentProfile`(`userId`) ON DELETE NO ACTION ON UPDATE NO ACTION;
