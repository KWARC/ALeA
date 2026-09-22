-- Names for new Cdi users are collected into staging (JWT has none) and copied on promote.

ALTER TABLE `unverifiedUsers` ADD COLUMN `firstName` VARCHAR(255) NULL;
ALTER TABLE `unverifiedUsers` ADD COLUMN `lastName` VARCHAR(255) NULL;
