create database comments_test;
use comments_test;

ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'abctest';

CREATE TABLE comments (
    commentId int PRIMARY KEY AUTO_INCREMENT,
    archive varchar(255),
    filepath varchar(255),

    parentCommentId int,
    threadId int,
    statement text,
    commentType ENUM('QUESTION', 'REMARK', 'OTHER'),
    questionStatus ENUM('UNANSWERED', 'ANSWERED', 'ACCEPTED', 'OTHER'),
    courseId varchar(255),
    courseTerm varchar(255),
    institutionId varchar(255),
    isEdited tinyint,
    isPrivate tinyint,
    isDeleted tinyint,

    hiddenStatus enum('UNHIDDEN', 'SPAM', 'INCORRECT', 'IRRELEVANT', 'ABUSE','OTHER'),
    hiddenJustification varchar(255),

    selectedText text,
    selectedElement text,

    isAnonymous tinyint,
    userId varchar(255),
    userName varchar(255),
    userEmail varchar(255),

    postedTimestamp timestamp DEFAULT CURRENT_TIMESTAMP,
    updatedTimestamp timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    uri VARCHAR(1023),
    pageUrl VARCHAR(1023)
);


CREATE TABLE updateHistory (
   updateId int PRIMARY KEY AUTO_INCREMENT,
    ownerId varchar(255),
    updaterId varchar(255),
    commentId int NOT NULL,
    previousStatement text,
    previousHiddenStatus enum('UNHIDDEN', 'SPAM', 'INCORRECT', 'IRRELEVANT', 'ABUSE','OTHER'),
    previousHiddenJustification varchar(255),
    previousQuestionStatus ENUM('UNANSWERED', 'ANSWERED', 'ACCEPTED', 'OTHER'),

    updatedTimestamp timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE points (
    points int,
    reason varchar(255),

    userId varchar(255),
	commentId int unique,
    granterId varchar(255),

	grantTimestamp timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
    updateId INT PRIMARY KEY AUTO_INCREMENT,
    userId VARCHAR(255),
    header VARCHAR(255),
    content VARCHAR(255),
    header_de VARCHAR(255),
    content_de VARCHAR(255),
    link VARCHAR(255),
    notificationType VARCHAR(255),
    postedTimestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedTimestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE userInfo (
    userId VARCHAR(50) PRIMARY KEY,
    firstName VARCHAR(255),
    lastName VARCHAR(255),
    email VARCHAR(255),
    languages VARCHAR(255),
    studyProgram VARCHAR(255),
    semester VARCHAR(255),
    notificationSeenTs VARCHAR(255),
    showTrafficLight BOOLEAN DEFAULT TRUE,
    showSectionReview BOOLEAN DEFAULT TRUE,
    saltedPassword VARCHAR(255),
    verificationToken VARCHAR(255),
    isVerified BOOLEAN,
    passwordResetToken VARCHAR(255),
    passwordResetRequestTimestampMs BIGINT
);

CREATE TABLE StudyBuddyUsers (
    userId VARCHAR(255) NOT NULL,
    courseId VARCHAR(100) NOT NULL,
    instanceId VARCHAR(50) NOT NULL,
    institutionId VARCHAR(50) NOT NULL DEFAULT 'FAU',

    active BOOLEAN NOT NULL,
    email VARCHAR(255) NOT NULL,

    userName VARCHAR(255),
    intro VARCHAR(1023),
    studyProgram VARCHAR(255),
    semester INT,
    meetType VARCHAR(255),
    languages VARCHAR(255),
    dayPreference VARCHAR(255),
    createdTimestamp timestamp DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (userId, courseId, instanceId, institutionId)
);

CREATE TABLE BlogPosts (
    postId VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    authorId VARCHAR(100) NOT NULL,
    authorName VARCHAR(255) NOT NULL,
    heroImageId VARCHAR(255),
    heroImageUrl VARCHAR(255),
    heroImagePosition VARCHAR(255),

    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE CdnImages (
    id VARCHAR(255) NOT NULL,
    metadata JSON NOT NUll
);

CREATE TABLE StudyBuddyConnections (
    senderId VARCHAR(255) NOT NULL,
    receiverId VARCHAR(255) NOT NULL,
    courseId VARCHAR(100) NOT NULL,
    instanceId VARCHAR(50) NOT NULL,
    institutionId VARCHAR(50) NOT NULL DEFAULT 'FAU',
    timeOfIssue TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (senderId, receiverId, courseId, instanceId, institutionId)
);

CREATE TABLE AccessControlList (
    id VARCHAR  (255) PRIMARY KEY,
    description TEXT,
    updaterACLId VARCHAR(255),
    isOpen BOOLEAN,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE ACLMembership(
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    parentACLId VARCHAR(255) NOT NULL,
    memberACLId VARCHAR(255) NULL,
    memberUserId VARCHAR(255) NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parentACLId) REFERENCES AccessControlList(id)
);

CREATE TABLE ResourceAccess(
    resourceId VARCHAR(255) NOT NULL,
    actionId VARCHAR(255) NOT NULL,
    aclId VARCHAR(255) NOT NULL,
    PRIMARY KEY (resourceId, actionId),
    FOREIGN KEY(aclId) REFERENCES AccessControlList(id),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

ALTER TABLE StudyBuddyConnections ADD CONSTRAINT StudyBuddyConnections_fk0 FOREIGN KEY (senderId) REFERENCES StudyBuddyUsers(userId);
ALTER TABLE StudyBuddyConnections ADD CONSTRAINT StudyBuddyConnections_fk1 FOREIGN KEY (receiverId) REFERENCES StudyBuddyUsers(userId);

/* Query to get 2-way connections */
SELECT DISTINCT t1.senderId, t1.receiverId FROM StudyBuddyConnections t1 JOIN StudyBuddyConnections t2 ON t1.senderId = t2.receiverId AND t1.receiverId = t2.senderId WHERE t1.senderId < t1.receiverId;

/* Query to get 1-way connection requests */
SELECT t1.senderId, t1.receiverId FROM StudyBuddyConnections t1 LEFT JOIN StudyBuddyConnections t2 ON t1.senderId = t2.receiverId AND t1.receiverId = t2.senderId WHERE t2.senderId IS NULL AND t2.receiverId IS NULL AND t1.senderId < t1.receiverId;
-- this is related to homework database
CREATE TABLE Answer  (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  questionId varchar(255) NOT NULL,
  subProblemId varchar(255) NULL,
  userId varchar(255) NOT NULL,
  answer TEXT NULL,
  questionTitle TEXT NULL,
  courseId varchar(255) NULL,
  courseInstance varchar(255) NULL,
  institutionId VARCHAR(255),
  homeworkId INT NULL,

  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE Grading  (
  id int UNSIGNED NOT NULL AUTO_INCREMENT,
  checkerId varchar(255) NOT NULL,
  reviewType enum('SELF', 'INSTRUCTOR', 'PEER') NOT NULL,

  answerId int UNSIGNED NOT NULL,
  customFeedback TEXT NULL,
  totalPoints float NOT NULL,
  homeworkId INT NULL,

  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (answerId) REFERENCES Answer (id) ON DELETE CASCADE
);

CREATE TABLE GradingAnswerClass  (
  id int UNSIGNED NOT NULL AUTO_INCREMENT,
  gradingId int UNSIGNED NOT NULL,
  answerClassId varchar(255) NOT NULL,
  points float NOT NULL,
  isTrait boolean NOT NULL,
  closed boolean NOT NULL,
  title varchar(255) NOT NULL,
  description TEXT NULL,
  count int NULL DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (gradingId) REFERENCES Grading (id) ON DELETE CASCADE
);

CREATE TABLE ReviewRequest   (
  id int UNSIGNED NOT NULL AUTO_INCREMENT,
  reviewType enum('INSTRUCTOR','PEER') NOT NULL,
  answerId  int UNSIGNED NOT NULL,
  userId varchar(255) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (answerId) REFERENCES Answer (id) ON DELETE CASCADE
);

CREATE TABLE homework (
    id INT PRIMARY KEY AUTO_INCREMENT,
    versionNo INT,
    title VARCHAR(1023),
    givenTs TIMESTAMP,
    dueTs TIMESTAMP,
    feedbackReleaseTs TIMESTAMP,
    courseId VARCHAR(255),
    courseInstance VARCHAR(255),
    institutionId VARCHAR(255),
    problems JSON,
    css JSON,
    updaterId VARCHAR(255),

    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE homeworkHistory (
    id INT,
    versionNo INT,
    title VARCHAR(255),
    givenTs TIMESTAMP,
    dueTs TIMESTAMP,
    feedbackReleaseTs TIMESTAMP,
    courseId VARCHAR(255),
    courseInstance VARCHAR(255),
    institutionId VARCHAR(255),
    problems JSON,
    updaterId VARCHAR(255),

    createdAt TIMESTAMP,

    PRIMARY KEY (id, versionNo)
);

-- Job Portal Tables
CREATE TABLE studentProfile (
    userId VARCHAR(50) PRIMARY KEY, 
    name VARCHAR(255) NOT NULL, 
    resumeUrl VARCHAR(2083), 
    email VARCHAR(255) NOT NULL, 
    mobile VARCHAR(15), 
    programme VARCHAR(255) NOT NULL, 
    yearOfAdmission YEAR NOT NULL, 
    yearOfGraduation YEAR, 
    courses TEXT, 
    about TEXT, 
    gpa FLOAT,
    location VARCHAR(100),
    altMobile VARCHAR(15),
    socialLinks JSON,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, 
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, 
    CONSTRAINT fk_user FOREIGN KEY (userId) REFERENCES userInfo(userId) 
);

CREATE TABLE organizationProfile (
    id INT AUTO_INCREMENT PRIMARY KEY, 
    companyName VARCHAR(255) , 
    domain VARCHAR(255) ,
    incorporationYear YEAR ,
    isStartup  BOOLEAN,
    website VARCHAR(255),
    about TEXT, 
    companyType VARCHAR(255),
    officeAddress Text, 
    officePostalCode VARCHAR(255) 
);


CREATE TABLE recruiterProfile (
    userId VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    position VARCHAR(255) NOT NULL, 
    organizationId INT ,
    mobile VARCHAR(15) ,
    altMobile VARCHAR (15),
    socialLinks JSON,
    about TEXT, 
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, 
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, 
    CONSTRAINT fk_recruiter FOREIGN KEY (userId) REFERENCES userInfo(userId) ,
    CONSTRAINT fk_organization FOREIGN KEY (organizationId) REFERENCES organizationProfile(id)
);

CREATE TABLE jobCategories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    jobCategory ENUM('internship', 'full-time') NOT NULL,
    internshipPeriod VARCHAR(255),
    startDate DATE,
    endDate DATE,
    instanceId VARCHAR(255),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE jobPortalAdmin (
    id SERIAL PRIMARY KEY,                  
    name VARCHAR(255) NOT NULL,            
    email VARCHAR(255) UNIQUE NOT NULL,    
    universityName VARCHAR(255) NOT NULL,  
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP 
);

CREATE TABLE jobPost (
    id INT AUTO_INCREMENT PRIMARY KEY,                          
    organizationId INT,                                          
    jobCategoryId INT,                                               
    session VARCHAR(255),                                         
    jobTitle VARCHAR(255),                                        
    jobDescription TEXT,                                          
    workLocation VARCHAR(255),                                
    qualification VARCHAR(255),                                   
    targetYears VARCHAR(255),                                     
    openPositions INT,                                            
    compensation JSON,            
    facilities TEXT,                                              
    applicationDeadline DATETIME,   
    workMode VARCHAR(50),
    createdByUserId VARCHAR(50),                              
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,                
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,  
    FOREIGN KEY (organizationId) REFERENCES organizationProfile(id),  
    FOREIGN KEY (jobCategoryId) REFERENCES jobCategories(id),
    FOREIGN KEY (createdByUserId) REFERENCES userInfo(userId)                
);


CREATE TABLE jobApplication (
    id INT AUTO_INCREMENT PRIMARY KEY, 
    jobPostId INT NOT NULL, 
    applicantId VARCHAR(50) NOT NULL, 
    applicationStatus ENUM(
        'APPLIED', 
        'APPLICATION_WITHDRAWN', 
        'SHORTLISTED_FOR_INTERVIEW', 
        'ON_HOLD', 
        'REJECTED', 
        'OFFERED', 
        'OFFER_REVOKED',
        'OFFER_ACCEPTED', 
        'OFFER_REJECTED'
    ) NOT NULL DEFAULT 'APPLIED', 
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_jobPost FOREIGN KEY (jobPostId) REFERENCES jobPost(id) ,
    CONSTRAINT fk_applicant FOREIGN KEY (applicantId) REFERENCES studentProfile(userId) 
);

CREATE TABLE jobApplicationAction (
    id INT AUTO_INCREMENT PRIMARY KEY,
    jobApplicationId INT NOT NULL,
    actionByRole ENUM(
        'APPLICANT',
        'RECRUITER',
        'ADMIN'
    ) NOT NULL,
    userId VARCHAR(50) NOT NULL,
    actionType ENUM(
        'CREATE_APPLICATION',
        'WITHDRAW_APPLICATION',
        'ACCEPT_OFFER',
        'REJECT_OFFER',
        'SHORTLIST_FOR_INTERVIEW',
        'ON_HOLD',
        'REJECT',
        'SEND_OFFER',
        'REVOKE_OFFER'
    ) NOT NULL,
    message VARCHAR(255),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_action_application
        FOREIGN KEY (jobApplicationId)
        REFERENCES jobApplication(id)
        ON DELETE CASCADE
); 

CREATE TABLE orgInvitations (
    id INT AUTO_INCREMENT PRIMARY KEY, 
    organizationId int NOT NULL,
    inviteeEmail VARCHAR(255) NOT NULL,
    inviteruserId CHAR(36) NOT NULL,     
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organizationId) REFERENCES organizationProfile(id) ON DELETE CASCADE
);

CREATE TABLE excused(
    id int PRIMARY KEY AUTO_INCREMENT,
    userId varchar(255) NOT NULL,
    quizId varchar(255) NOT NULL,
    courseId VARCHAR(255) NOT NULL,
    courseInstance VARCHAR(255) NOT NULL,
    institutionId VARCHAR(255) NOT NULL,
);

CREATE TABLE semesterInfo (
  universityId VARCHAR(50),
  instanceId VARCHAR(50),
  semesterStart TIMESTAMP,
  semesterEnd TIMESTAMP,
  lectureStartDate TIMESTAMP,
  lectureEndDate TIMESTAMP,
  holidays JSON NOT NULL,
  userId VARCHAR(255),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (universityId, instanceId)
);

CREATE TABLE announcement(
    id INT PRIMARY KEY AUTO_INCREMENT,
    courseId VARCHAR(255) NOT NULL,
    instructorId VARCHAR(255) NOT NULL,
    institutionId VARCHAR(255) NOT NULL,
    instanceId VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    visibleUntil TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE courseMetadata (
    courseId VARCHAR(50) NOT NULL,
    instanceId VARCHAR(50) NOT NULL,
    lectureSchedule JSON NOT NULL,
    tutorialSchedule JSON,
    seriesId VARCHAR(255),
    hasHomework BOOLEAN NOT NULL DEFAULT FALSE,
    hasQuiz BOOLEAN NOT NULL DEFAULT FALSE,
    updaterId VARCHAR(255),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    universityId VARCHAR(255) NOT NULL,
    courseName VARCHAR(255) NOT NULL,
    notes VARCHAR(255) NOT NULL,
    landing VARCHAR(255) NOT NULL,
    slides VARCHAR(255) NOT NULL,
    teaser TEXT,
    instructors JSON NOT NULL,
    PRIMARY KEY (courseId, instanceId)
);

CREATE TABLE CrossDomainAuthTokens (
    otpToken VARCHAR(255) PRIMARY KEY,
    jwtToken TEXT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used BOOLEAN DEFAULT FALSE
);
