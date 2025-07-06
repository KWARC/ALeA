import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfGetOrSetError,
  executeDontEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfGetOrSetError(req, res)) return;
  const userId = req.query.userId as string;
  if (!userId) return res.status(422).send('Missing userId');
  const results: any = await executeDontEndSet500OnError(
    `SELECT name, resumeUrl, email, mobile, programme, yearOfAdmission, yearOfGraduation, 
        courses, grades,gpa,location, about,socialLinks
    FROM studentProfile 
    WHERE userId = ? 
    `,
    [userId],
    res
  );
  if (!results || !results.length) return;
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
