import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfPostOrSetError,
  executeTxnAndEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';
import { isFauId } from '@alea/utils';

function getJobPortalStudentsAcl() {
  return `job-portal-students`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const userId = await getUserIdOrSetError(req, res);
  if (!userId || !isFauId(userId)) return;

  const {
    name,
    email,
    mobile,
    altMobile,
    programme,
    gpa,
    yearOfAdmission,
    yearOfGraduation,
    courses,
    location,
    about,
    resumeUrl,
  } = req.body;
  if (!name || !email) return res.status(422).end();
  const parsedGpa = gpa ? Number(gpa) : null;
  const studentsAclId = getJobPortalStudentsAcl();
  const result = await executeTxnAndEndSet500OnError(
    res,
    `INSERT INTO studentProfile 
      (name,userId, resumeUrl, email,gpa, mobile,altMobile, programme, yearOfAdmission, yearOfGraduation, 
        courses,location, about) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      userId,
      resumeUrl,
      email,
      parsedGpa,
      mobile,
      altMobile,
      programme,
      yearOfAdmission,
      yearOfGraduation,
      courses,
      location,
      about,
    ],
    'INSERT INTO ACLMembership (parentACLId, memberUserId) VALUES (?, ?)',
    [studentsAclId, userId]
  );
  if (!result) return;
  res.status(201).end();
}
