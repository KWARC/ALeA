INSERT INTO courseMetadata (
    courseId,
    instanceId,
    lectureSchedule,
    tutorialSchedule,
    seriesId,
    hasHomework,
    hasQuiz,
    updaterId,
    createdAt,
    updatedAt,
    universityId,
    courseName,
    notes,
    landing,
    slides,
    teaser,
    instructors
) VALUES
-- ai-1
('ai-1','legacy',JSON_ARRAY(),JSON_ARRAY(),NULL,FALSE,FALSE,NULL,
 '2021-01-01 00:00:00','2021-01-01 00:00:00','FAU',
 'Artificial Intelligence I',
 'https://mathhub.info?a=courses/FAU/AI/course&p=course/notes&d=notes1&l=en',
 'https://mathhub.info?a=courses/FAU/AI/course&p=course/notes&d=coursepage1&l=en',
 'https://mathhub.info?a=courses/FAU/AI/course&p=course/notes&d=slides1&l=en',
 'A classical course on symbolic artificial intelligence covering the whole range of methods from search-based problem solving, via constraint propagation and logical/formal methods to planning.',
 JSON_ARRAY('Michael Kohlhase')
),

-- ai-2
('ai-2','legacy',JSON_ARRAY(),JSON_ARRAY(),NULL,FALSE,FALSE,NULL,
 '2021-01-01 00:00:00','2021-01-01 00:00:00','FAU',
 'Artificial Intelligence II',
 'https://mathhub.info?a=courses/FAU/AI/course&p=course/notes&d=notes2&l=en',
 'https://mathhub.info?a=courses/FAU/AI/course&p=course/notes&d=coursepage2&l=en',
 'https://mathhub.info?a=courses/FAU/AI/course&p=course/notes&d=slides2&l=en',
 'A classical course on statistical and subsymbolic AI...',
 JSON_ARRAY('Michael Kohlhase')
),

-- gdp
('gdp','legacy',JSON_ARRAY(),JSON_ARRAY(),NULL,FALSE,FALSE,NULL,
 '2021-01-01 00:00:00','2021-01-01 00:00:00','FAU',
 'Grundlagen der Programmierung',
 'https://stexmmt.mathhub.info/:sTeX?a=courses/FAU/GDP/course&p=course/notes&d=notes&l=en',
 'https://stexmmt.mathhub.info/:sTeX?a=courses/FAU/GDP/course&p=course/notes&d=coursepage&l=en',
 'https://stexmmt.mathhub.info/:sTeX?a=courses/FAU/GDP/course&p=course/notes&d=slides&l=en',
 NULL,
 JSON_ARRAY('Vanessa Klein')
),

-- iwgs-1
('iwgs-1','legacy',JSON_ARRAY(),JSON_ARRAY(),NULL,FALSE,FALSE,NULL,
 '2021-01-01 00:00:00','2021-01-01 00:00:00','FAU',
 'Informatische Werkzeuge für die Geistes- und Sozialwissenschaften I',
 'https://mathhub.info?a=courses/FAU/IWGS/course&p=course/notes&d=notes-part1&l=en',
 'https://mathhub.info?a=courses/FAU/IWGS/course&p=course/notes&d=coursepage1&l=en',
 'https://mathhub.info?a=courses/FAU/IWGS/course&p=course/notes&d=slides-part1&l=en',
 'This course introduces computational tools for humanities...',
 JSON_ARRAY('Michael Kohlhase')
),

-- iwgs-2
('iwgs-2','legacy',JSON_ARRAY(),JSON_ARRAY(),NULL,FALSE,FALSE,NULL,
 '2021-01-01 00:00:00','2021-01-01 00:00:00','FAU',
 'Informatische Werkzeuge für die Geistes- und Sozialwissenschaften II',
 'https://mathhub.info?a=courses/FAU/IWGS/course&p=course/notes&d=notes-part2&l=en',
 'https://mathhub.info?a=courses/FAU/IWGS/course&p=course/notes&d=coursepage2&l=en',
 'https://mathhub.info?a=courses/FAU/IWGS/course&p=course/notes&d=slides-part2&l=en',
 'This course continues the introduction...',
 JSON_ARRAY('Michael Kohlhase')
),

-- krmt
('krmt','legacy',JSON_ARRAY(),JSON_ARRAY(),NULL,FALSE,FALSE,NULL,
 '2021-01-01 00:00:00','2021-01-01 00:00:00','FAU',
 'Knowledge Representation of Mathematical Theories',
 'https://mathhub.info?a=courses/FAU/KRMT/course&p=dennis/course&d=notes&l=en',
 'https://mathhub.info?a=courses/FAU/KRMT/course&p=dennis/course&d=coursepage&l=en',
 'https://mathhub.info?a=courses/FAU/KRMT/course&p=dennis/course&d=slides&l=en',
 '<p>This repository contains the sources...',
 JSON_ARRAY('Michael Kohlhase')
),

-- lbs
('lbs','legacy',JSON_ARRAY(),JSON_ARRAY(),NULL,FALSE,FALSE,NULL,
 '2021-01-01 00:00:00','2021-01-01 00:00:00','FAU',
 'Logic-Based Natural Language Semantics',
 'https://mathhub.info?a=courses/FAU/LBS/course&p=course/notes&d=notes&l=en',
 'https://mathhub.info?a=courses/FAU/LBS/course&p=course/notes&d=coursepage&l=en',
 'https://mathhub.info?a=courses/FAU/LBS/course&p=course/notes&d=slides&l=en',
 'This course covers the construction of logic-based models...',
 JSON_ARRAY('Michael Kohlhase')
),

-- smai
('smai','legacy',JSON_ARRAY(),JSON_ARRAY(),NULL,FALSE,FALSE,NULL,
 '2021-01-01 00:00:00','2021-01-01 00:00:00','FAU',
 'Symbolic Methods for Artificial Intelligence',
 'https://mathhub.info?a=courses/FAU/SMAI/course&p=course/notes&d=notes&l=en',
 'https://mathhub.info?a=courses/FAU/SMAI/course&p=course/notes&d=coursepage&l=en',
 'https://mathhub.info?a=courses/FAU/SMAI/course&p=course/notes&d=slides&l=en',
 'This course introduces the scientific methods used in symbolic AI...',
 JSON_ARRAY('Michael Kohlhase')
),

-- acs
('acs','legacy',JSON_ARRAY(),JSON_ARRAY(),NULL,FALSE,FALSE,NULL,
 '2021-01-01 00:00:00','2021-01-01 00:00:00','Jacobs',
 'Advanced Computer Science (Fragment)',
 'https://stexmmt.mathhub.info/:sTeX?a=courses/Jacobs/ACS/course&p=course/notes&d=notes&l=en',
 'https://stexmmt.mathhub.info/:sTeX?a=courses/Jacobs/ACS/course&p=course/notes&d=coursepage&l=en',
 'https://stexmmt.mathhub.info/:sTeX?a=courses/Jacobs/ACS/course&p=course/notes&d=slides&l=en',
 NULL,
 JSON_ARRAY('Michael Kohlhase')
),

-- comsem
('comsem','legacy',JSON_ARRAY(),JSON_ARRAY(),NULL,FALSE,FALSE,NULL,
 '2021-01-01 00:00:00','2021-01-01 00:00:00','Jacobs',
 'Computational Semantics of Natural Language',
 'https://mathhub.info?a=courses/Jacobs/ComSem&p=course/notes&d=notes&l=en',
 'https://mathhub.info?a=courses/Jacobs/ComSem&p=course/notes&d=coursepage&l=en',
 'https://mathhub.info?a=courses/Jacobs/ComSem&p=course/notes&d=slides&l=en',
 '<p>This repository contains the sources...',
 JSON_ARRAY('Michael Kohlhase')
),

-- complog
('complog','legacy',JSON_ARRAY(),JSON_ARRAY(),NULL,FALSE,FALSE,NULL,
 '2021-01-01 00:00:00','2021-01-01 00:00:00','Jacobs',
 'Computational Logic',
 'https://mathhub.info?a=courses/Jacobs/CompLog&p=course/notes&d=notes&l=en',
 'https://mathhub.info?a=courses/Jacobs/CompLog&p=course/notes&d=coursepage&l=en',
 'https://mathhub.info?a=courses/Jacobs/CompLog&p=course/notes&d=slides&l=en',
 '<p>This repository contains the sources...',
 JSON_ARRAY('Michael Kohlhase')
),

-- gencs i
('gencs i','legacy',JSON_ARRAY(),JSON_ARRAY(),NULL,FALSE,FALSE,NULL,
 '2021-01-01 00:00:00','2021-01-01 00:00:00','Jacobs',
 'General Computer Science I',
 'https://mathhub.info?a=courses/Jacobs/GenCS/course&p=course/notes&d=notes1&l=en',
 'https://mathhub.info?a=courses/Jacobs/GenCS/course&p=course/notes&d=coursepage1&l=en',
 'https://mathhub.info?a=courses/Jacobs/GenCS/course&p=course/notes&d=slides1&l=en',
 '<p>This repository contains the sources...',
 JSON_ARRAY('Michael Kohlhase')
),

-- gencs ii
('gencs ii','legacy',JSON_ARRAY(),JSON_ARRAY(),NULL,FALSE,FALSE,NULL,
 '2021-01-01 00:00:00','2021-01-01 00:00:00','Jacobs',
 'General Computer Science II',
 'https://mathhub.info?a=courses/Jacobs/GenCS/course&p=course/notes&d=notes2&l=en',
 'https://mathhub.info?a=courses/Jacobs/GenCS/course&p=course/notes&d=coursepage2&l=en',
 'https://mathhub.info?a=courses/Jacobs/GenCS/course&p=course/notes&d=slides2&l=en',
 '<p>This repository contains the sources...',
 JSON_ARRAY('Michael Kohlhase')
),

-- genict
('genict','legacy',JSON_ARRAY(),JSON_ARRAY(),NULL,FALSE,FALSE,NULL,
 '2021-01-01 00:00:00','2021-01-01 00:00:00','Jacobs',
 'General Information and Communication Technology',
 'https://mathhub.info?a=courses/Jacobs/GenICT/course&p=course/notes&d=notes&l=en',
 'https://mathhub.info?a=courses/Jacobs/GenICT/course&p=course/notes&d=coursepage&l=en',
 'https://mathhub.info?a=courses/Jacobs/GenICT/course&p=course/notes&d=slides&l=en',
 NULL,
 JSON_ARRAY('Michael Kohlhase')
),

-- tdm
('tdm','legacy',JSON_ARRAY(),JSON_ARRAY(),NULL,FALSE,FALSE,NULL,
 '2021-01-01 00:00:00','2021-01-01 00:00:00','Jacobs',
 'Text and Digital Media',
 'https://mathhub.info?a=courses/Jacobs/TDM/course&p=course/notes&d=notes&l=en',
 'https://mathhub.info?a=courses/Jacobs/TDM/course&p=course/notes&d=coursepage&l=en',
 'https://mathhub.info?a=courses/Jacobs/TDM/course&p=course/notes&d=slides&l=en',
 '<p>This repository contains the sources...',
 JSON_ARRAY('Michael Kohlhase')
);
