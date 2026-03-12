[dotenv@17.3.1] injecting env (38) from packages/alea-frontend/.env.local -- tip: 🛡️ auth for agents: https://vestauth.com
-- CreateTable
CREATE TABLE `ACLMembership` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `parentACLId` VARCHAR(255) NOT NULL,
    `memberACLId` VARCHAR(255) NULL,
    `memberUserId` VARCHAR(255) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `parentACLId`(`parentACLId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AccessControlList` (
    `id` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `updaterACLId` VARCHAR(255) NULL,
    `isOpen` BOOLEAN NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Answer` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `questionId` VARCHAR(255) NOT NULL,
    `subProblemId` VARCHAR(255) NULL,
    `userId` VARCHAR(255) NOT NULL,
    `answer` TEXT NULL,
    `questionTitle` TEXT NULL,
    `courseId` VARCHAR(255) NULL,
    `courseInstance` VARCHAR(255) NULL,
    `institutionId` VARCHAR(255) NULL DEFAULT 'FAU',
    `homeworkId` INTEGER NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BlogPosts` (
    `postId` VARCHAR(255) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `body` TEXT NOT NULL,
    `authorId` VARCHAR(100) NOT NULL,
    `authorName` VARCHAR(255) NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `heroImageId` VARCHAR(255) NULL,
    `heroImageUrl` VARCHAR(255) NULL,
    `heroImagePosition` VARCHAR(255) NULL
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CdnImages` (
    `id` VARCHAR(255) NOT NULL,
    `metadata` JSON NOT NULL
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CourseMaterials` (
    `id` VARCHAR(36) NOT NULL,
    `materialName` VARCHAR(255) NOT NULL,
    `materialType` ENUM('FILE', 'LINK') NOT NULL,
    `storageFileName` TEXT NULL,
    `mimeType` VARCHAR(100) NULL,
    `sizeBytes` BIGINT NULL,
    `universityId` VARCHAR(100) NOT NULL,
    `courseId` VARCHAR(100) NOT NULL,
    `instanceId` VARCHAR(100) NOT NULL,
    `uploadedBy` VARCHAR(100) NOT NULL,
    `url` TEXT NULL,
    `checksum` VARCHAR(64) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CrossDomainAuthTokens` (
    `otpToken` VARCHAR(255) NOT NULL,
    `jwtToken` TEXT NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `used` BOOLEAN NULL DEFAULT false,

    PRIMARY KEY (`otpToken`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Grading` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `checkerId` VARCHAR(255) NOT NULL,
    `answerId` INTEGER UNSIGNED NOT NULL,
    `customFeedback` TEXT NULL,
    `totalPoints` FLOAT NOT NULL,
    `homeworkId` INTEGER NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `reviewType` ENUM('SELF', 'INSTRUCTOR', 'PEER') NOT NULL,

    INDEX `answerId`(`answerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GradingAnswerClass` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `gradingId` INTEGER UNSIGNED NOT NULL,
    `answerClassId` VARCHAR(255) NOT NULL,
    `points` FLOAT NOT NULL,
    `isTrait` BOOLEAN NOT NULL,
    `closed` BOOLEAN NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `count` INTEGER NULL DEFAULT 1,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `gradingId`(`gradingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ResourceAccess` (
    `resourceId` VARCHAR(255) NOT NULL,
    `actionId` VARCHAR(255) NOT NULL,
    `aclId` VARCHAR(255) NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `aclId`(`aclId`),
    PRIMARY KEY (`resourceId`, `actionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StudyBuddyConnections` (
    `senderId` VARCHAR(255) NOT NULL,
    `receiverId` VARCHAR(255) NOT NULL,
    `sbCourseId` VARCHAR(255) NOT NULL,
    `courseId` VARCHAR(100) NOT NULL,
    `instanceId` VARCHAR(50) NOT NULL,
    `institutionId` VARCHAR(50) NOT NULL DEFAULT 'FAU',
    `timeOfIssue` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`senderId`, `receiverId`, `courseId`, `instanceId`, `institutionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StudyBuddyUsers` (
    `userId` VARCHAR(255) NOT NULL,
    `sbCourseId` VARCHAR(255) NOT NULL,
    `courseId` VARCHAR(100) NOT NULL,
    `instanceId` VARCHAR(50) NOT NULL,
    `institutionId` VARCHAR(50) NOT NULL DEFAULT 'FAU',
    `active` BOOLEAN NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `userName` VARCHAR(255) NULL,
    `intro` VARCHAR(1023) NULL,
    `studyProgram` VARCHAR(255) NULL,
    `semester` INTEGER NULL,
    `meetType` VARCHAR(255) NULL,
    `languages` VARCHAR(255) NULL,
    `dayPreference` VARCHAR(255) NULL,
    `createdTimestamp` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`userId`, `courseId`, `instanceId`, `institutionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `announcement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `courseId` VARCHAR(255) NOT NULL,
    `instructorId` VARCHAR(255) NOT NULL,
    `institutionId` VARCHAR(255) NOT NULL,
    `instanceId` VARCHAR(255) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `content` TEXT NOT NULL,
    `visibleUntil` TIMESTAMP(0) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `comments` (
    `commentId` INTEGER NOT NULL AUTO_INCREMENT,
    `archive` VARCHAR(255) NULL,
    `filepath` VARCHAR(255) NULL,
    `parentCommentId` INTEGER NULL,
    `statement` TEXT NULL,
    `isEdited` TINYINT NULL,
    `isPrivate` TINYINT NULL,
    `isDeleted` TINYINT NULL,
    `hiddenStatus` ENUM('UNHIDDEN', 'SPAM', 'INCORRECT', 'IRRELEVANT', 'ABUSE', 'OTHER') NULL,
    `hiddenJustification` VARCHAR(255) NULL,
    `selectedText` TEXT NULL,
    `selectedElement` TEXT NULL,
    `isAnonymous` TINYINT NULL,
    `userId` VARCHAR(255) NULL,
    `userName` VARCHAR(255) NULL,
    `userEmail` VARCHAR(255) NULL,
    `postedTimestamp` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedTimestamp` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `threadId` INTEGER NULL,
    `commentType` ENUM('QUESTION', 'REMARK', 'OTHER') NULL,
    `questionStatus` ENUM('UNANSWERED', 'ANSWERED', 'ACCEPTED', 'OTHER') NULL,
    `courseId` VARCHAR(255) NULL,
    `courseTerm` VARCHAR(255) NULL,
    `institutionId` VARCHAR(255) NULL,
    `uri` VARCHAR(1023) NULL,
    `pageUrl` VARCHAR(1023) NULL,

    PRIMARY KEY (`commentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `courseMetadata` (
    `courseId` VARCHAR(50) NOT NULL,
    `instanceId` VARCHAR(50) NOT NULL,
    `lectureSchedule` JSON NOT NULL,
    `hasHomework` BOOLEAN NOT NULL DEFAULT false,
    `hasQuiz` BOOLEAN NOT NULL DEFAULT false,
    `updaterId` VARCHAR(255) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `universityId` VARCHAR(255) NOT NULL,
    `courseName` VARCHAR(255) NOT NULL,
    `notes` VARCHAR(255) NOT NULL,
    `landing` VARCHAR(255) NOT NULL,
    `slides` VARCHAR(255) NOT NULL,
    `teaser` TEXT NULL,
    `instructors` JSON NOT NULL,
    `tutorialSchedule` JSON NULL,
    `seriesId` VARCHAR(255) NULL,

    PRIMARY KEY (`courseId`, `instanceId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `excused` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` VARCHAR(255) NOT NULL,
    `quizId` VARCHAR(255) NOT NULL,
    `courseId` VARCHAR(255) NOT NULL,
    `courseInstance` VARCHAR(255) NOT NULL,
    `institutionId` VARCHAR(255) NOT NULL DEFAULT 'FAU',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `homework` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `versionNo` INTEGER NULL,
    `title` VARCHAR(1023) NULL,
    `givenTs` TIMESTAMP(0) NULL,
    `dueTs` TIMESTAMP(0) NULL,
    `feedbackReleaseTs` TIMESTAMP(0) NULL,
    `courseId` VARCHAR(255) NULL,
    `courseInstance` VARCHAR(255) NULL,
    `institutionId` VARCHAR(255) NULL DEFAULT 'FAU',
    `problems` JSON NULL,
    `updaterId` VARCHAR(255) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `css` JSON NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `homeworkHistory` (
    `id` INTEGER NOT NULL,
    `versionNo` INTEGER NOT NULL,
    `title` VARCHAR(255) NULL,
    `givenTs` TIMESTAMP(0) NULL,
    `dueTs` TIMESTAMP(0) NULL,
    `feedbackReleaseTs` TIMESTAMP(0) NULL,
    `courseId` VARCHAR(255) NULL,
    `courseInstance` VARCHAR(255) NULL,
    `institutionId` VARCHAR(255) NULL DEFAULT 'FAU',
    `problems` JSON NULL,
    `updaterId` VARCHAR(255) NULL,
    `createdAt` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`, `versionNo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `jobApplication` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `jobPostId` INTEGER NOT NULL,
    `applicantId` VARCHAR(50) NOT NULL,
    `applicationStatus` ENUM('APPLIED', 'APPLICATION_WITHDRAWN', 'SHORTLISTED_FOR_INTERVIEW', 'ON_HOLD', 'REJECTED', 'OFFERED', 'OFFER_REVOKED', 'OFFER_ACCEPTED', 'OFFER_REJECTED') NOT NULL DEFAULT 'APPLIED',
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_applicant`(`applicantId`),
    INDEX `fk_jobPost`(`jobPostId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `jobApplicationAction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `jobApplicationId` INTEGER NOT NULL,
    `actionByRole` ENUM('APPLICANT', 'RECRUITER', 'ADMIN') NOT NULL,
    `userId` VARCHAR(50) NOT NULL,
    `actionType` ENUM('CREATE_APPLICATION', 'WITHDRAW_APPLICATION', 'ACCEPT_OFFER', 'REJECT_OFFER', 'SHORTLIST_FOR_INTERVIEW', 'ON_HOLD', 'REJECT', 'SEND_OFFER', 'REVOKE_OFFER') NOT NULL,
    `message` VARCHAR(255) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_action_application`(`jobApplicationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `jobCategories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `jobCategory` ENUM('internship', 'full-time') NOT NULL,
    `internshipPeriod` VARCHAR(255) NULL,
    `startDate` DATE NULL,
    `endDate` DATE NULL,
    `instanceId` VARCHAR(255) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `jobPortalAdmin` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `universityName` VARCHAR(255) NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `id`(`id`),
    UNIQUE INDEX `email`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `jobPost` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organizationId` INTEGER NULL,
    `jobCategoryId` INTEGER NULL,
    `session` VARCHAR(255) NULL,
    `jobTitle` VARCHAR(255) NULL,
    `jobDescription` TEXT NULL,
    `workLocation` VARCHAR(255) NULL,
    `qualification` VARCHAR(255) NULL,
    `graduationYears` VARCHAR(255) NULL,
    `openPositions` INTEGER NULL,
    `compensation` JSON NULL,
    `facilities` TEXT NULL,
    `applicationDeadline` TIMESTAMP(0) NULL,
    `workMode` VARCHAR(50) NULL,
    `createdByUserId` VARCHAR(50) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `createdByUserId`(`createdByUserId`),
    INDEX `jobCategoryId`(`jobCategoryId`),
    INDEX `organizationId`(`organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `userId` VARCHAR(255) NULL,
    `updateId` INTEGER NOT NULL AUTO_INCREMENT,
    `header` VARCHAR(255) NULL,
    `content` VARCHAR(255) NULL,
    `header_de` VARCHAR(255) NULL,
    `content_de` VARCHAR(255) NULL,
    `link` VARCHAR(255) NULL,
    `notificationType` VARCHAR(255) NULL,
    `postedTimestamp` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedTimestamp` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`updateId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orgInvitations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organizationId` INTEGER NOT NULL,
    `inviteeEmail` VARCHAR(255) NOT NULL,
    `inviteruserId` CHAR(36) NOT NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `organizationId`(`organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organizationProfile` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `companyName` VARCHAR(255) NULL,
    `domain` VARCHAR(255) NULL,
    `incorporationYear` VARCHAR(50) NULL,
    `isStartup` BOOLEAN NULL,
    `website` VARCHAR(255) NULL,
    `about` TEXT NULL,
    `companyType` VARCHAR(255) NULL,
    `officeAddress` TEXT NULL,
    `officePostalCode` VARCHAR(255) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `points` (
    `points` INTEGER NULL,
    `reason` VARCHAR(255) NULL,
    `userId` VARCHAR(255) NULL,
    `commentId` INTEGER NULL,
    `granterId` VARCHAR(255) NULL,
    `grantTimestamp` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `commentId`(`commentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recruiterProfile` (
    `userId` VARCHAR(50) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `position` VARCHAR(255) NOT NULL,
    `organizationId` INTEGER NULL,
    `mobile` VARCHAR(15) NULL,
    `altMobile` VARCHAR(15) NULL,
    `socialLinks` JSON NULL,
    `about` TEXT NULL,
    `createdAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_organization`(`organizationId`),
    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `semesterInfo` (
    `universityId` VARCHAR(50) NOT NULL,
    `instanceId` VARCHAR(50) NOT NULL,
    `semesterStart` TIMESTAMP(0) NULL,
    `semesterEnd` TIMESTAMP(0) NULL,
    `lectureStartDate` TIMESTAMP(0) NULL,
    `lectureEndDate` TIMESTAMP(0) NULL,
    `holidays` JSON NOT NULL,
    `userId` VARCHAR(255) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`universityId`, `instanceId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `studentProfile` (
    `userId` VARCHAR(50) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `resumeUrl` VARCHAR(2083) NULL,
    `email` VARCHAR(255) NOT NULL,
    `mobile` VARCHAR(15) NULL,
    `programme` VARCHAR(255) NULL,
    `yearOfAdmission` VARCHAR(50) NULL,
    `yearOfGraduation` VARCHAR(50) NULL,
    `courses` TEXT NULL,
    `about` TEXT NULL,
    `gpa` VARCHAR(50) NULL,
    `location` VARCHAR(100) NULL,
    `altMobile` VARCHAR(15) NULL,
    `socialLinks` JSON NULL,
    `createdAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `updateHistory` (
    `updateId` INTEGER NOT NULL AUTO_INCREMENT,
    `ownerId` VARCHAR(255) NULL,
    `updaterId` VARCHAR(255) NOT NULL,
    `commentId` INTEGER NOT NULL,
    `previousStatement` TEXT NULL,
    `previousHiddenStatus` ENUM('UNHIDDEN', 'SPAM', 'INCORRECT', 'IRRELEVANT', 'ABUSE', 'OTHER') NULL,
    `previousHiddenJustification` VARCHAR(255) NULL,
    `updatedTimestamp` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `previousQuestionStatus` ENUM('UNANSWERED', 'ANSWERED', 'ACCEPTED', 'OTHER') NULL,

    PRIMARY KEY (`updateId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `userInfo` (
    `userId` VARCHAR(50) NOT NULL,
    `firstName` VARCHAR(255) NULL,
    `lastName` VARCHAR(255) NULL,
    `email` VARCHAR(255) NULL,
    `notificationSeenTs` VARCHAR(255) NULL,
    `showTrafficLight` BOOLEAN NULL DEFAULT true,
    `showSectionReview` BOOLEAN NULL DEFAULT true,
    `saltedPassword` VARCHAR(255) NULL,
    `verificationToken` VARCHAR(255) NULL,
    `isVerified` BOOLEAN NULL,
    `passwordResetToken` VARCHAR(255) NULL,
    `passwordResetRequestTimestampMs` BIGINT NULL,
    `languages` VARCHAR(255) NULL,
    `studyProgram` VARCHAR(255) NULL,
    `semester` VARCHAR(255) NULL,

    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ACLMembership` ADD CONSTRAINT `ACLMembership_ibfk_1` FOREIGN KEY (`parentACLId`) REFERENCES `AccessControlList`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Grading` ADD CONSTRAINT `Grading_ibfk_1` FOREIGN KEY (`answerId`) REFERENCES `Answer`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `GradingAnswerClass` ADD CONSTRAINT `GradingAnswerClass_ibfk_1` FOREIGN KEY (`gradingId`) REFERENCES `Grading`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `ResourceAccess` ADD CONSTRAINT `ResourceAccess_ibfk_1` FOREIGN KEY (`aclId`) REFERENCES `AccessControlList`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `jobApplication` ADD CONSTRAINT `fk_applicant` FOREIGN KEY (`applicantId`) REFERENCES `studentProfile`(`userId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `jobApplication` ADD CONSTRAINT `fk_jobPost` FOREIGN KEY (`jobPostId`) REFERENCES `jobPost`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `jobApplicationAction` ADD CONSTRAINT `fk_action_application` FOREIGN KEY (`jobApplicationId`) REFERENCES `jobApplication`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `jobPost` ADD CONSTRAINT `jobPost_ibfk_1` FOREIGN KEY (`organizationId`) REFERENCES `organizationProfile`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `jobPost` ADD CONSTRAINT `jobPost_ibfk_2` FOREIGN KEY (`jobCategoryId`) REFERENCES `jobCategories`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `jobPost` ADD CONSTRAINT `jobPost_ibfk_3` FOREIGN KEY (`createdByUserId`) REFERENCES `userInfo`(`userId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `orgInvitations` ADD CONSTRAINT `orgInvitations_ibfk_1` FOREIGN KEY (`organizationId`) REFERENCES `organizationProfile`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `recruiterProfile` ADD CONSTRAINT `fk_organization` FOREIGN KEY (`organizationId`) REFERENCES `organizationProfile`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `recruiterProfile` ADD CONSTRAINT `fk_recruiter` FOREIGN KEY (`userId`) REFERENCES `userInfo`(`userId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `studentProfile` ADD CONSTRAINT `fk_user` FOREIGN KEY (`userId`) REFERENCES `userInfo`(`userId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

