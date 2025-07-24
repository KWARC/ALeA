import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkIfPostOrSetError,
  executeAndEndSet500OnError,
  getUserIdOrSetError,
} from '../comment-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkIfPostOrSetError(req, res)) return;
  const userId = await getUserIdOrSetError(req, res);
  if (!userId) return;

  const {
    name,
    email,
    mobile,
    programme,
    yearOfAdmission,
    yearOfGraduation,
    courses,
    grades,
    about,
    resumeUrl,
  } = req.body;
  const result = await executeAndEndSet500OnError(
    `INSERT INTO stuentProfile 
      (name,userId, resumeUrl, email, mobile, programme, yearOfAdmission, yearOfGraduation, 
        courses, grades, about) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)`,
    [
      name,
      userId,
      resumeUrl,
      email,
      mobile,
      programme,
      yearOfAdmission,
      yearOfGraduation,
      courses,
      grades,
      about,
    ],
    res
  );
  if (!result) return;
  res.status(201).end();
}
