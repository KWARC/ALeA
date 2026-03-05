-- Add livestreamUrl column to courseMetadata for livestream link
ALTER TABLE courseMetadata ADD COLUMN livestreamUrl VARCHAR(2048) NULL AFTER teaser;
