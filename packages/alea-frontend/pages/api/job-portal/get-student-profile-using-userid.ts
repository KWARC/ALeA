import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfGetOrSetError,
  executeDontEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';
import { getRecruiterProfileByUserIdOrSet500OnError } from './get-recruiter-profile';

async function canRecruiterAccessStudentProfile(
  req: NextApiRequest,
  res: NextApiResponse,
  studentUserId: string
) {
  const currentUserId = await getUserIdOrSetError(req, res);
  if (!currentUserId) return;
  const recruiterProfile = await getRecruiterProfileByUserIdOrSet500OnError(currentUserId, res);
  if (!recruiterProfile) return;
  const orgId = recruiterProfile.organizationId;
  const results: any[] = await executeDontEndSet500OnError(
    `
    SELECT 1
    FROM jobApplication ja
    JOIN jobPost jp ON ja.jobPostId = jp.id
    WHERE jp.organizationId = ?
      AND ja.applicantId = ?
    LIMIT 1
    `,
    [orgId, studentUserId],
    res
  );
  if (!results) return;
  const canAccess = results.length > 0;
  if (!canAccess) return res.status(403).send('Access denied');
  return true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;
  const userId = req.query.userId as string;
  if (!userId) return res.status(422).send('Missing userId');
  if (!(await canRecruiterAccessStudentProfile(req, res, userId))) return;
  const results: any[] = await executeDontEndSet500OnError(
    `SELECT name, resumeUrl, email, mobile, programme, yearOfAdmission, yearOfGraduation, 
        courses,gpa,location, about,socialLinks
    FROM studentProfile 
    WHERE userId = ? 
    `,
    [userId],
    res
  );
  if (!results) return;
  if (!results.length) return res.status(404).end();
  const student = results[0];
  let parsedSocialLinks: Record<string, string> = {};

  if (typeof student.socialLinks === 'string') {
    parsedSocialLinks = JSON.parse(student.socialLinks);
  } else {
    parsedSocialLinks = student.socialLinks || {};
  }
  res.status(200).json({
    ...student,
    socialLinks: parsedSocialLinks,
  });
}
