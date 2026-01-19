-- Complete script to migrate StudyBuddy tables from sbCourseId to separate columns
-- Run this script step by step or as a whole

-- STEP 1: Add new columns
ALTER TABLE StudyBuddyUsers ADD COLUMN courseId VARCHAR(100) AFTER sbCourseId;
ALTER TABLE StudyBuddyUsers ADD COLUMN instanceId VARCHAR(50) AFTER courseId;
ALTER TABLE StudyBuddyUsers ADD COLUMN institutionId VARCHAR(50) NOT NULL DEFAULT 'FAU' AFTER instanceId;

ALTER TABLE StudyBuddyConnections ADD COLUMN courseId VARCHAR(100) AFTER sbCourseId;
ALTER TABLE StudyBuddyConnections ADD COLUMN instanceId VARCHAR(50) AFTER courseId;
ALTER TABLE StudyBuddyConnections ADD COLUMN institutionId VARCHAR(50) NOT NULL DEFAULT 'FAU' AFTER instanceId;

-- STEP 2: Backfill data
UPDATE StudyBuddyUsers
SET courseId = SUBSTRING_INDEX(sbCourseId, '||', 1),
    instanceId = SUBSTRING_INDEX(sbCourseId, '||', -1)
WHERE sbCourseId IS NOT NULL AND (courseId IS NULL OR instanceId IS NULL);

UPDATE StudyBuddyConnections
SET courseId = SUBSTRING_INDEX(sbCourseId, '||', 1),
    instanceId = SUBSTRING_INDEX(sbCourseId, '||', -1)
WHERE sbCourseId IS NOT NULL AND (courseId IS NULL OR instanceId IS NULL);

-- STEP 3: Make columns NOT NULL
ALTER TABLE StudyBuddyUsers MODIFY COLUMN courseId VARCHAR(100) NOT NULL;
ALTER TABLE StudyBuddyUsers MODIFY COLUMN instanceId VARCHAR(50) NOT NULL;

ALTER TABLE StudyBuddyConnections MODIFY COLUMN courseId VARCHAR(100) NOT NULL;
ALTER TABLE StudyBuddyConnections MODIFY COLUMN instanceId VARCHAR(50) NOT NULL;

-- STEP 4: Find foreign key constraint names (run this query first)
-- SELECT CONSTRAINT_NAME 
-- FROM information_schema.KEY_COLUMN_USAGE 
-- WHERE TABLE_SCHEMA = DATABASE() 
--   AND TABLE_NAME = 'StudyBuddyConnections' 
--   AND REFERENCED_TABLE_NAME = 'StudyBuddyUsers';

-- STEP 5: Drop foreign keys (replace constraint names with actual names from STEP 4)
ALTER TABLE StudyBuddyConnections DROP FOREIGN KEY StudyBuddyConnections_fk0;
ALTER TABLE StudyBuddyConnections DROP FOREIGN KEY StudyBuddyConnections_fk1;

-- STEP 6: Drop old primary keys
ALTER TABLE StudyBuddyUsers DROP PRIMARY KEY;
ALTER TABLE StudyBuddyConnections DROP PRIMARY KEY;

-- STEP 7: Create new primary keys
ALTER TABLE StudyBuddyUsers ADD PRIMARY KEY (userId, courseId, instanceId, institutionId);
ALTER TABLE StudyBuddyConnections ADD PRIMARY KEY (senderId, receiverId, courseId, instanceId, institutionId);

-- STEP 8: Recreate foreign keys
ALTER TABLE StudyBuddyConnections ADD CONSTRAINT StudyBuddyConnections_fk0 FOREIGN KEY (senderId) REFERENCES StudyBuddyUsers(userId);
ALTER TABLE StudyBuddyConnections ADD CONSTRAINT StudyBuddyConnections_fk1 FOREIGN KEY (receiverId) REFERENCES StudyBuddyUsers(userId);

-- STEP 9: Drop sbCourseId column
ALTER TABLE StudyBuddyUsers DROP COLUMN sbCourseId;
ALTER TABLE StudyBuddyConnections DROP COLUMN sbCourseId;

SELECT 'Migration completed successfully!' as status;

