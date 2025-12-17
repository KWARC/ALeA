alter table announcement
add column institutionId varchar(255) not null default 'FAU' after instructorId;

alter table comments
add column institutionId varchar(255) not null default 'FAU' after courseTerm;

alter table homework
add column institutionId varchar(255) not null default 'FAU' after courseInstance;

alter table homeworkHistory
add column institutionId varchar(255) not null default 'FAU' after courseInstance;

alter table Answer
add column institutionId varchar(255) not null default 'FAU' after courseInstance;

alter table excused
add column institutionId varchar(255) not null default 'FAU' after courseInstance;