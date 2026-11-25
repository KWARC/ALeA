ALTER TABLE `userInfo` ADD COLUMN `calendarSecret` VARCHAR(36) NULL;

CREATE UNIQUE INDEX `userInfo_calendarSecret_key` ON `userInfo`(`calendarSecret`);
