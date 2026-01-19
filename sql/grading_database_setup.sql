create database grading;
use grading;

DROP TABLE grading;

CREATE TABLE grading (
    gradingId int PRIMARY KEY AUTO_INCREMENT,
    userId varchar(255) NOT NULL,
    quizId varchar(255) NOT NULL,
    problemId varchar(255) NOT NULL,
    
    universityId varchar(255) NOT NULL DEFAULT '',
    courseId varchar(255) NOT NULL DEFAULT '',
    instanceId varchar(255) NOT NULL DEFAULT '',
    
    response JSON,
    /* DEPRECATED:
    singleOptionIdxs varchar(255), # comma delimited list of numbers
    multipleOptionIdxs varchar(255), # comma delimited list of numbers
    filledInAnswer text,
    */
    points float,
    
    browserTimestamp_ms bigint,
    postedTimestamp timestamp DEFAULT CURRENT_TIMESTAMP
);
SELECT * FROM grading;

-- For optimizing the get-quiz API
CREATE INDEX idx_grading_optimus ON grading (quizId, userId, problemId, browserTimestamp_ms); 
