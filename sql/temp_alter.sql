alter table announcement
add column institutionId varchar(255) null after instructorId;

alter table comments
add column institutionId varchar(255) null after courseTerm;